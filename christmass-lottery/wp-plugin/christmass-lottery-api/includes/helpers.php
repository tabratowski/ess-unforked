<?php

const CL_NAMESPACE = 'cl/v1';

/** Only the Next.js server (admin application password) may call cl/v1. */
function cl_permission(): bool {
	return current_user_can('manage_options');
}

function cl_error(string $code, string $message, int $status): WP_Error {
	return new WP_Error($code, $message, ['status' => $status]);
}

function cl_user_payload(WP_User $user): array {
	return [
		'id' => $user->ID,
		'login' => $user->user_login,
		'email' => $user->user_email,
	];
}

function cl_valid_login(string $login): bool {
	return (bool) preg_match('/^[A-Za-z0-9_.-]{3,30}$/', $login);
}

function cl_valid_password(string $password): bool {
	return strlen($password) >= 8;
}

function cl_valid_capacity($capacity): bool {
	if (!is_int($capacity) && !(is_string($capacity) && ctype_digit($capacity))) {
		return false;
	}
	return cl_capacity_ok((int) $capacity);
}
