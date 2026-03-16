import Phaser from 'phaser';

const BUMPER_POSITIONS = [
  { x: 300, y: 420 },
  { x: 500, y: 420 },
  { x: 400, y: 460 },
];

const BUMPER_RADIUS = 12;

export function createBumpers(scene, physicsGroups) {
  const bumpers = [];

  for (const pos of BUMPER_POSITIONS) {
    const bumper = scene.physics.add.sprite(pos.x, pos.y, 'bumper');
    bumper.setImmovable(true);
    bumper.body.setAllowGravity(false);
    bumper.setPushable(false);
    bumper.body.setCircle(
      BUMPER_RADIUS,
      (bumper.width / 2) - BUMPER_RADIUS,
      (bumper.height / 2) - BUMPER_RADIUS,
    );

    scene.tweens.add({
      targets: bumper,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    bumpers.push(bumper);
  }

  for (const bumper of bumpers) {
    if (physicsGroups.coins) {
      scene.physics.add.collider(physicsGroups.coins, bumper);
    }
    if (physicsGroups.prizes) {
      scene.physics.add.collider(physicsGroups.prizes, bumper);
    }
  }

  return bumpers;
}
