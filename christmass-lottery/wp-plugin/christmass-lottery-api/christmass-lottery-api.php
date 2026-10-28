<?php
/**
 * Plugin Name: Christmass Lottery API
 * Description: Private REST API (cl/v1) for the Christmass Lottery headless app. Stores groups and draws.
 * Version: 1.0.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
	exit;
}

require_once __DIR__ . '/includes/draw.php';
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/rest-users.php';
require_once __DIR__ . '/includes/rest-groups.php';

add_action('init', function () {
	register_post_type('cl_group', [
		'label' => 'Lottery groups',
		'public' => false,
		'show_ui' => true,
		'show_in_rest' => false,
		'supports' => ['title'],
		'menu_icon' => 'dashicons-groups',
	]);
});

add_action('rest_api_init', function () {
	cl_register_user_routes();
	cl_register_group_routes();
});
