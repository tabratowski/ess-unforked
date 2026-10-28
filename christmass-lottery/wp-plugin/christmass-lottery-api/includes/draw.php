<?php
/**
 * Pure draw/join logic. No WordPress functions here so it can be tested from the CLI.
 */

const CL_MAX_CAPACITY = 100;

function cl_capacity_ok(int $capacity): bool {
	return $capacity >= 2 && $capacity <= CL_MAX_CAPACITY && $capacity % 2 === 0;
}

/** Run the draw if the group just became full. */
function cl_draw_if_full(array $state): array {
	if ($state['status'] === 'open' && count($state['member_ids']) === (int) $state['capacity']) {
		$state['assignments'] = cl_draw($state['member_ids']);
		$state['status'] = 'drawn';
		$state['drawn_at'] = gmdate('c');
	}
	return $state;
}

/**
 * Shuffle members into one random cycle: member i gives to member i+1.
 * Nobody draws themselves and the draw can never get stuck.
 *
 * @param int[] $member_ids
 * @return array<int,int> giver_id => receiver_id
 */
function cl_draw(array $member_ids): array {
	$ids = array_values($member_ids);
	for ($i = count($ids) - 1; $i > 0; $i--) {
		$j = random_int(0, $i);
		[$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
	}
	$n = count($ids);
	$map = [];
	for ($i = 0; $i < $n; $i++) {
		$map[$ids[$i]] = $ids[($i + 1) % $n];
	}
	return $map;
}

/**
 * Apply a join to a group's state. Runs the draw when the last seat is taken.
 *
 * @param array $state ['capacity','member_ids','status','assignments','drawn_at']
 * @return array ['state' => array, 'error' => ?string]
 */
function cl_apply_join(array $state, int $user_id): array {
	if ($state['status'] === 'drawn') {
		return ['state' => $state, 'error' => 'group_drawn'];
	}
	if (in_array($user_id, $state['member_ids'], true)) {
		return ['state' => $state, 'error' => 'already_member'];
	}
	if (count($state['member_ids']) >= $state['capacity']) {
		return ['state' => $state, 'error' => 'group_full'];
	}

	$state['member_ids'][] = $user_id;

	return ['state' => cl_draw_if_full($state), 'error' => null];
}

/** Change capacity of an open group. Shrinking to the headcount runs the draw. */
function cl_apply_update(array $state, int $capacity): array {
	if ($state['status'] === 'drawn') {
		return ['state' => $state, 'error' => 'group_drawn'];
	}
	if (!cl_capacity_ok($capacity)) {
		return ['state' => $state, 'error' => 'invalid_capacity'];
	}
	if ($capacity < count($state['member_ids'])) {
		return ['state' => $state, 'error' => 'capacity_below_members'];
	}
	$state['capacity'] = $capacity;

	return ['state' => cl_draw_if_full($state), 'error' => null];
}

/** Remove a member from an open group. */
function cl_apply_remove(array $state, int $user_id): array {
	if ($state['status'] === 'drawn') {
		return ['state' => $state, 'error' => 'group_drawn'];
	}
	if (!in_array($user_id, $state['member_ids'], true)) {
		return ['state' => $state, 'error' => 'not_member'];
	}
	$state['member_ids'] = array_values(array_filter($state['member_ids'], fn($id) => $id !== $user_id));

	return ['state' => $state, 'error' => null];
}

/** Reshuffle a drawn group with the same members and a new draw date. */
function cl_apply_redraw(array $state): array {
	if ($state['status'] !== 'drawn') {
		return ['state' => $state, 'error' => 'not_drawn'];
	}
	$state['assignments'] = cl_draw($state['member_ids']);
	$state['drawn_at'] = gmdate('c');

	return ['state' => $state, 'error' => null];
}
