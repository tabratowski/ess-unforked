<?php
// Run: php christmass-lottery/wp-plugin/tests/draw-test.php
require __DIR__ . '/../christmass-lottery-api/includes/draw.php';

function check($cond, $msg) {
	if (!$cond) {
		fwrite(STDERR, "FAIL: $msg\n");
		exit(1);
	}
}

// cl_draw: valid single cycle, nobody draws themselves
$ids = [1, 2, 3, 4];
$seen = [];
for ($i = 0; $i < 500; $i++) {
	$map = cl_draw($ids);
	$keys = array_keys($map);
	$vals = array_values($map);
	sort($keys);
	sort($vals);
	check($keys === $ids, 'every member gives exactly once');
	check($vals === $ids, 'every member receives exactly once');
	foreach ($map as $k => $v) {
		check($k !== $v, 'nobody draws themselves');
	}
	$cur = 1;
	$steps = 0;
	do {
		$cur = $map[$cur];
		$steps++;
	} while ($cur !== 1 && $steps <= 4);
	check($steps === 4, 'assignments form a single cycle');
	$seen[json_encode($map)] = true;
}
check(count($seen) > 1, 'draw is random');
$pair = cl_draw([7, 9]);
check($pair[7] === 9 && $pair[9] === 7 && count($pair) === 2, 'two members swap');

// cl_apply_join
$open = ['capacity' => 4, 'member_ids' => [1, 2], 'status' => 'open', 'assignments' => [], 'drawn_at' => null];

$r = cl_apply_join($open, 3);
check($r['error'] === null, 'join open group succeeds');
check($r['state']['status'] === 'open', 'not full yet stays open');
check($r['state']['member_ids'] === [1, 2, 3], 'member added');

$r = cl_apply_join($open, 1);
check($r['error'] === 'already_member', 'already member rejected');

$drawn = ['capacity' => 2, 'member_ids' => [1, 2], 'status' => 'drawn', 'assignments' => [1 => 2, 2 => 1], 'drawn_at' => '2026-12-01T00:00:00+00:00'];
check(cl_apply_join($drawn, 3)['error'] === 'group_drawn', 'drawn group rejected');

$full = ['capacity' => 2, 'member_ids' => [1, 2], 'status' => 'open', 'assignments' => [], 'drawn_at' => null];
check(cl_apply_join($full, 3)['error'] === 'group_full', 'full group rejected');

$r = cl_apply_join(['capacity' => 4, 'member_ids' => [1, 2, 3], 'status' => 'open', 'assignments' => [], 'drawn_at' => null], 4);
check($r['error'] === null, 'last seat join succeeds');
check($r['state']['status'] === 'drawn', 'last seat triggers draw');
check(count($r['state']['assignments']) === 4, 'everyone assigned');
check($r['state']['drawn_at'] !== null, 'draw date stored');

// cl_apply_update (resize)
$open3 = ['capacity' => 6, 'member_ids' => [1, 2, 3], 'status' => 'open', 'assignments' => [], 'drawn_at' => null];
$r = cl_apply_update($open3, 8);
check($r['error'] === null && $r['state']['capacity'] === 8 && $r['state']['status'] === 'open', 'grow open group');
check(cl_apply_update($open3, 2)['error'] === 'capacity_below_members', 'cannot shrink below member count');
check(cl_apply_update($open3, 5)['error'] === 'invalid_capacity', 'odd capacity rejected');
$open4 = ['capacity' => 6, 'member_ids' => [1, 2, 3, 4], 'status' => 'open', 'assignments' => [], 'drawn_at' => null];
$r = cl_apply_update($open4, 4);
check($r['error'] === null && $r['state']['status'] === 'drawn' && count($r['state']['assignments']) === 4, 'shrink to headcount draws');
check(cl_apply_update($drawn, 4)['error'] === 'group_drawn', 'cannot resize drawn group');

// cl_apply_remove
$r = cl_apply_remove($open3, 2);
check($r['error'] === null && $r['state']['member_ids'] === [1, 3], 'remove member from open group');
check(cl_apply_remove($open3, 9)['error'] === 'not_member', 'remove non-member rejected');
check(cl_apply_remove($drawn, 1)['error'] === 'group_drawn', 'cannot remove from drawn group');

// cl_apply_redraw
$drawn4 = ['capacity' => 4, 'member_ids' => [1, 2, 3, 4], 'status' => 'drawn', 'assignments' => [1 => 2, 2 => 3, 3 => 4, 4 => 1], 'drawn_at' => '2000-01-01T00:00:00+00:00'];
$r = cl_apply_redraw($drawn4);
check($r['error'] === null && $r['state']['status'] === 'drawn', 'redraw keeps group drawn');
check($r['state']['drawn_at'] !== '2000-01-01T00:00:00+00:00', 'redraw updates draw date');
$keys = array_keys($r['state']['assignments']);
sort($keys);
check($keys === [1, 2, 3, 4], 'redraw assigns every member');
foreach ($r['state']['assignments'] as $k => $v) {
	check($k !== $v, 'redraw: nobody draws themselves');
}
check(cl_apply_redraw($open3)['error'] === 'not_drawn', 'cannot redraw open group');

// cl_apply_reveal
$r = cl_apply_reveal($drawn4, 2);
check($r['error'] === null && $r['state']['revealed'] === [2], 'reveal marks member');
$r = cl_apply_reveal($r['state'], 2);
check($r['error'] === null && $r['state']['revealed'] === [2], 'reveal is idempotent');
check(cl_apply_reveal($drawn4, 9)['error'] === 'not_member', 'non-member cannot reveal');
check(cl_apply_reveal($open3, 1)['error'] === 'not_drawn', 'cannot reveal before draw');

// redraw and fresh draws reset revealed
$r = cl_apply_redraw(array_merge($drawn4, ['revealed' => [1, 2]]));
check($r['state']['revealed'] === [], 'redraw clears revealed');
$r = cl_apply_join(['capacity' => 2, 'member_ids' => [1], 'status' => 'open', 'assignments' => [], 'drawn_at' => null], 2);
check($r['state']['revealed'] === [], 'new draw starts with nobody revealed');

echo "OK\n";
