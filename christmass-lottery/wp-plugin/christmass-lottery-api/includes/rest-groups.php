<?php

function cl_register_group_routes(): void {
	register_rest_route(CL_NAMESPACE, '/groups', [
		[
			'methods' => 'GET',
			'callback' => 'cl_rest_list_groups',
			'permission_callback' => 'cl_permission',
		],
		[
			'methods' => 'POST',
			'callback' => 'cl_rest_create_group',
			'permission_callback' => 'cl_permission',
		],
	]);
	register_rest_route(CL_NAMESPACE, '/groups/(?P<id>\d+)/join', [
		'methods' => 'POST',
		'callback' => 'cl_rest_join_group',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/groups/(?P<id>\d+)/assignment', [
		'methods' => 'GET',
		'callback' => 'cl_rest_get_assignment',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/groups/(?P<id>\d+)', [
		[
			'methods' => 'PATCH',
			'callback' => 'cl_rest_update_group',
			'permission_callback' => 'cl_permission',
		],
		[
			'methods' => 'DELETE',
			'callback' => 'cl_rest_delete_group',
			'permission_callback' => 'cl_permission',
		],
	]);
	register_rest_route(CL_NAMESPACE, '/groups/(?P<id>\d+)/members', [
		'methods' => 'GET',
		'callback' => 'cl_rest_list_members',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/groups/(?P<id>\d+)/members/(?P<user_id>\d+)', [
		'methods' => 'DELETE',
		'callback' => 'cl_rest_remove_member',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/groups/(?P<id>\d+)/redraw', [
		'methods' => 'POST',
		'callback' => 'cl_rest_redraw_group',
		'permission_callback' => 'cl_permission',
	]);
}

const CL_STATE_ERRORS = [
	'group_full' => 'This group is already full.',
	'already_member' => "You're already in this group.",
	'group_drawn' => 'This group has already been drawn.',
	'not_member' => 'That person is not in this group.',
	'not_drawn' => 'This group has not been drawn yet.',
	'invalid_capacity' => 'Capacity must be an even number between 2 and ' . CL_MAX_CAPACITY . '.',
	'capacity_below_members' => 'Capacity cannot be lower than the number of people already in the group.',
];

/**
 * Apply a pure state change (cl_apply_*) to a group under a per-group MySQL lock,
 * so concurrent joins/removals/resizes can't interleave.
 *
 * @param callable $change fn(array $state): array{state: array, error: ?string}
 * @return true|WP_Error
 */
function cl_mutate_group(int $id, callable $change) {
	global $wpdb;
	$lock = 'cl_group_' . $id;
	if ((string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 10)', $lock)) !== '1') {
		return cl_error('busy', 'Please try again.', 503);
	}
	try {
		wp_cache_delete($id, 'post_meta');
		$result = $change(cl_read_state($id));
		if ($result['error'] !== null) {
			$status = $result['error'] === 'not_member' ? 404 : ($result['error'] === 'invalid_capacity' ? 400 : 409);
			return cl_error($result['error'], CL_STATE_ERRORS[$result['error']], $status);
		}
		cl_write_state($id, $result['state']);
		return true;
	} finally {
		$wpdb->query($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock));
	}
}

function cl_get_group_post(int $id): ?WP_Post {
	$post = get_post($id);
	return ($post && $post->post_type === 'cl_group' && $post->post_status === 'publish') ? $post : null;
}

function cl_read_state(int $id): array {
	return [
		'capacity' => (int) get_post_meta($id, 'capacity', true),
		'member_ids' => array_map('intval', (array) (get_post_meta($id, 'member_ids', true) ?: [])),
		'status' => get_post_meta($id, 'status', true) ?: 'open',
		'assignments' => (array) (get_post_meta($id, 'assignments', true) ?: []),
		'drawn_at' => get_post_meta($id, 'drawn_at', true) ?: null,
	];
}

function cl_write_state(int $id, array $state): void {
	if (isset($state['capacity'])) {
		update_post_meta($id, 'capacity', (int) $state['capacity']);
	}
	update_post_meta($id, 'member_ids', $state['member_ids']);
	update_post_meta($id, 'status', $state['status']);
	update_post_meta($id, 'assignments', $state['assignments']);
	update_post_meta($id, 'drawn_at', $state['drawn_at'] ?? '');
}

/** Public shape of a group. Never includes assignments. */
function cl_group_payload(WP_Post $post, int $user_id = 0): array {
	$state = cl_read_state($post->ID);
	return [
		'id' => $post->ID,
		'name' => $post->post_title,
		'capacity' => $state['capacity'],
		'memberCount' => count($state['member_ids']),
		'status' => $state['status'],
		'drawnAt' => $state['drawn_at'],
		'isMember' => $user_id > 0 && in_array($user_id, $state['member_ids'], true),
	];
}

function cl_rest_list_groups(WP_REST_Request $req) {
	$user_id = (int) $req->get_param('user_id');
	$posts = get_posts([
		'post_type' => 'cl_group',
		'post_status' => 'publish',
		'numberposts' => -1,
		'orderby' => 'date',
		'order' => 'DESC',
	]);
	return array_map(fn($p) => cl_group_payload($p, $user_id), $posts);
}

function cl_rest_create_group(WP_REST_Request $req) {
	$name = trim((string) $req->get_param('name'));
	$capacity = $req->get_param('capacity');
	if ($name === '' || !cl_valid_capacity($capacity)) {
		return cl_error('invalid_input', 'Name is required and capacity must be an even number between 2 and ' . CL_MAX_CAPACITY . '.', 400);
	}

	$id = wp_insert_post([
		'post_type' => 'cl_group',
		'post_status' => 'publish',
		'post_title' => $name,
	], true);
	if (is_wp_error($id)) {
		return cl_error('create_failed', $id->get_error_message(), 500);
	}

	update_post_meta($id, 'capacity', (int) $capacity);
	cl_write_state($id, ['member_ids' => [], 'status' => 'open', 'assignments' => [], 'drawn_at' => null]);

	return new WP_REST_Response(cl_group_payload(get_post($id)), 201);
}

function cl_rest_join_group(WP_REST_Request $req) {
	$id = (int) $req['id'];
	$user_id = (int) $req->get_param('user_id');

	$post = cl_get_group_post($id);
	if (!$post || !get_userdata($user_id)) {
		return cl_error('not_found', 'Group or user not found.', 404);
	}
	$result = cl_mutate_group($id, fn($state) => cl_apply_join($state, $user_id));
	if (is_wp_error($result)) {
		return $result;
	}

	return cl_group_payload($post, $user_id);
}

function cl_rest_get_assignment(WP_REST_Request $req) {
	$id = (int) $req['id'];
	$user_id = (int) $req->get_param('user_id');

	$post = cl_get_group_post($id);
	if (!$post) {
		return cl_error('not_found', 'Group not found.', 404);
	}
	$state = cl_read_state($id);
	if (!in_array($user_id, $state['member_ids'], true)) {
		return cl_error('not_member', 'You are not a member of this group.', 404);
	}
	if ($state['status'] !== 'drawn' || !isset($state['assignments'][$user_id])) {
		return cl_error('not_drawn', 'This group has not been drawn yet.', 404);
	}
	$receiver = get_userdata((int) $state['assignments'][$user_id]);

	return [
		'groupName' => $post->post_title,
		'receiverLogin' => $receiver ? $receiver->user_login : '(deleted user)',
	];
}

function cl_rest_update_group(WP_REST_Request $req) {
	$id = (int) $req['id'];
	$post = cl_get_group_post($id);
	if (!$post) {
		return cl_error('not_found', 'Group not found.', 404);
	}

	$name = $req->get_param('name');
	if ($name !== null) {
		$name = trim((string) $name);
		if ($name === '') {
			return cl_error('invalid_input', 'Name is required.', 400);
		}
	}
	$capacity = $req->get_param('capacity');
	if ($capacity !== null && !cl_valid_capacity($capacity)) {
		return cl_error('invalid_capacity', CL_STATE_ERRORS['invalid_capacity'], 400);
	}

	if ($capacity !== null && (int) $capacity !== (int) get_post_meta($id, 'capacity', true)) {
		$result = cl_mutate_group($id, fn($state) => cl_apply_update($state, (int) $capacity));
		if (is_wp_error($result)) {
			return $result;
		}
	}
	if ($name !== null && $name !== $post->post_title) {
		wp_update_post(wp_slash(['ID' => $id, 'post_title' => $name]));
	}

	return cl_group_payload(get_post($id));
}

function cl_rest_delete_group(WP_REST_Request $req) {
	$id = (int) $req['id'];
	if (!cl_get_group_post($id)) {
		return cl_error('not_found', 'Group not found.', 404);
	}
	wp_delete_post($id, true);
	return ['deleted' => true];
}

function cl_rest_list_members(WP_REST_Request $req) {
	$id = (int) $req['id'];
	if (!cl_get_group_post($id)) {
		return cl_error('not_found', 'Group not found.', 404);
	}
	$members = [];
	foreach (cl_read_state($id)['member_ids'] as $user_id) {
		$user = get_userdata($user_id);
		$members[] = $user ? cl_user_payload($user) : ['id' => $user_id, 'login' => '(deleted user)', 'email' => ''];
	}
	return $members;
}

function cl_rest_remove_member(WP_REST_Request $req) {
	$id = (int) $req['id'];
	$user_id = (int) $req['user_id'];
	$post = cl_get_group_post($id);
	if (!$post) {
		return cl_error('not_found', 'Group not found.', 404);
	}
	$result = cl_mutate_group($id, fn($state) => cl_apply_remove($state, $user_id));
	if (is_wp_error($result)) {
		return $result;
	}
	return cl_group_payload($post);
}

function cl_rest_redraw_group(WP_REST_Request $req) {
	$id = (int) $req['id'];
	$post = cl_get_group_post($id);
	if (!$post) {
		return cl_error('not_found', 'Group not found.', 404);
	}
	$result = cl_mutate_group($id, fn($state) => cl_apply_redraw($state));
	if (is_wp_error($result)) {
		return $result;
	}
	return cl_group_payload($post);
}
