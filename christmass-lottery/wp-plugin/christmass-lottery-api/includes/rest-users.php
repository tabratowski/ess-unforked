<?php

function cl_register_user_routes(): void {
	register_rest_route(CL_NAMESPACE, '/users', [
		'methods' => 'POST',
		'callback' => 'cl_rest_register_user',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/auth', [
		'methods' => 'POST',
		'callback' => 'cl_rest_auth',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/password-reset', [
		'methods' => 'POST',
		'callback' => 'cl_rest_password_reset',
		'permission_callback' => 'cl_permission',
	]);
	register_rest_route(CL_NAMESPACE, '/password-reset/confirm', [
		'methods' => 'POST',
		'callback' => 'cl_rest_password_reset_confirm',
		'permission_callback' => 'cl_permission',
	]);
}

function cl_rest_register_user(WP_REST_Request $req) {
	$login = trim((string) $req->get_param('login'));
	$email = strtolower(trim((string) $req->get_param('email')));
	$password = (string) $req->get_param('password');

	if (!cl_valid_login($login) || !is_email($email) || !cl_valid_password($password)) {
		return cl_error('invalid_input', 'Invalid login, email or password.', 400);
	}

	$id = wp_insert_user([
		'user_login' => $login,
		'user_email' => $email,
		'user_pass' => $password,
		'role' => 'subscriber',
	]);

	if (is_wp_error($id)) {
		$code = $id->get_error_code();
		if ($code === 'existing_user_login') {
			return cl_error('login_taken', 'That login is already registered.', 409);
		}
		if ($code === 'existing_user_email') {
			return cl_error('email_taken', 'That email is already registered.', 409);
		}
		return cl_error('invalid_input', $id->get_error_message(), 400);
	}

	return new WP_REST_Response(cl_user_payload(get_userdata($id)), 201);
}

function cl_rest_auth(WP_REST_Request $req) {
	$user = wp_authenticate((string) $req->get_param('login'), (string) $req->get_param('password'));
	if (is_wp_error($user)) {
		return cl_error('invalid_credentials', 'Wrong login or password.', 401);
	}
	return cl_user_payload($user);
}

function cl_rest_password_reset(WP_REST_Request $req) {
	$email = strtolower(trim((string) $req->get_param('email')));
	$user = $email ? get_user_by('email', $email) : false;
	if (!$user) {
		return cl_error('not_found', 'No such user.', 404);
	}
	$key = get_password_reset_key($user);
	if (is_wp_error($key)) {
		return cl_error('reset_failed', $key->get_error_message(), 500);
	}
	return ['login' => $user->user_login, 'key' => $key];
}

function cl_rest_password_reset_confirm(WP_REST_Request $req) {
	$password = (string) $req->get_param('password');
	if (!cl_valid_password($password)) {
		return cl_error('invalid_input', 'Password must be at least 8 characters.', 400);
	}
	$user = check_password_reset_key((string) $req->get_param('key'), (string) $req->get_param('login'));
	if (is_wp_error($user)) {
		return cl_error('invalid_key', 'This reset link is invalid or expired.', 400);
	}
	reset_password($user, $password);
	return ['ok' => true];
}
