const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

let game = new Phaser.Game(config);

let player, platforms, cursors, spaceKey, powerups;
let score = 0;
let scoreText, highScoreText;
let maxY = 0;
let poweredUp = false;
let powerupTimer = null;
let lastPlatformTouched = null;
let gameOver = false;
let gameOverText, restartButton;
let highScore = 0;
let nextPlatformY = 400;

function preload() {
  this.load.image('background', 'assets/fundo.png');
  this.load.image('platform', 'assets/platform.png');
  this.load.image('player', 'assets/player.png');
  this.load.image('powerup', 'assets/powerup.png');
  this.load.image('button', 'assets/button.png');
}

function create() {
  highScore = localStorage.getItem('crazyTowerHighScore') || 0;

  this.add.tileSprite(0, 0, 800, 6000, 'background').setOrigin(0).setScrollFactor(0);

  platforms = this.physics.add.staticGroup();
  powerups = this.physics.add.group();

  // Plataforma inicial
  platforms.create(200, 550, 'platform').refreshBody();

  // Jogador
  player = this.physics.add.sprite(200, 500, 'player').setScale(1);
  player.setCollideWorldBounds(false);
  player.setBounce(0);

  // Plataformas iniciais
  let y = 450;
  for (let i = 0; i < 8; i++) {
    let x = Phaser.Math.Between(50, 300);
    let plat = platforms.create(x, y, 'platform');
    plat.refreshBody(); // Garantir que seja estático
    if (Math.random() < 0.3) spawnPowerup(this, x + 30, y - 30);
    y -= Phaser.Math.Between(40, 55); // Espaçamento mais curto
  }

  nextPlatformY = y;

  this.physics.add.collider(player, platforms, platformTouched, null, this);
  this.physics.add.overlap(player, powerups, collectPowerup, null, this);

  cursors = this.input.keyboard.createCursorKeys();
  spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  this.cameras.main.startFollow(player);
  this.cameras.main.setBounds(0, -6000, 400, 6600);

  scoreText = this.add.text(10, 10, 'Pontuação: 0', {
    font: '20px Consolas',
    fill: '#ffffff'
  }).setScrollFactor(0);

  highScoreText = this.add.text(10, 40, `Recorde: ${highScore}`, {
    font: '20px Consolas',
    fill: '#ffcc00'
  }).setScrollFactor(0);

  gameOverText = this.add.text(200, 280, '', {
    font: '30px Consolas',
    fill: '#ff0000',
    align: 'center'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(999).setVisible(false);

  restartButton = this.add.image(200, 340, 'button')
    .setInteractive()
    .setVisible(false)
    .setScrollFactor(0)
    .setScale(0.6)
    .setDepth(999);

  restartButton.on('pointerdown', () => {
    this.scene.restart();
    resetGameState();
  });
}

function update() {
  if (gameOver) return;

  // Movimento
  if (cursors.left.isDown) {
    player.setVelocityX(-200);
  } else if (cursors.right.isDown) {
    player.setVelocityX(200);
  } else {
    player.setVelocityX(0);
  }

  // Pulo
  if ((cursors.up.isDown || spaceKey.isDown) && player.body.blocked.down) {
    const jumpForce = poweredUp ? -600 : -500;
    player.setVelocityY(jumpForce);
  }

  // Game over se cair da tela
  const bottomLimit = this.cameras.main.scrollY + 600;
  if (player.y > bottomLimit) {
    triggerGameOver(this);
  }

  // Atualiza altura máxima
  if (player.y < maxY) maxY = player.y;

  // Geração infinita de plataformas (não depende do jogador)
  const camTop = this.cameras.main.scrollY - 100;

  while (nextPlatformY > camTop) {
    const x = Phaser.Math.Between(50, 300);
    const plat = platforms.create(x, nextPlatformY, 'platform');
    plat.refreshBody(); // Impede que ela caia

    if (Math.random() < 0.3) spawnPowerup(this, x + 30, nextPlatformY - 30);

    nextPlatformY -= Phaser.Math.Between(40, 55); // Espaçamento ajustado
  }

  // Limpeza de objetos fora da tela
  platforms.getChildren().forEach((plat) => {
    if (plat.y > this.cameras.main.scrollY + 700) plat.destroy();
  });

  powerups.getChildren().forEach((pwr) => {
    if (pwr.y > this.cameras.main.scrollY + 700) pwr.destroy();
  });
}

function resetGameState() {
  score = 0;
  maxY = 0;
  poweredUp = false;
  gameOver = false;
  gameOverText.setVisible(false);
  restartButton.setVisible(false);
}

function triggerGameOver(scene) {
  if (gameOver) return;

  gameOver = true;
  player.setVelocity(0, 0);
  player.body.enable = false;

  gameOverText.setText(`Você perdeu!\nPontuação: ${score}`);
  gameOverText.setVisible(true);
  restartButton.setVisible(true);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('crazyTowerHighScore', highScore);
    highScoreText.setText(`Recorde: ${highScore}`);
  }
}

function spawnPowerup(scene, x, y) {
  let p = powerups.create(x, y, 'powerup');
  p.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
  p.setCollideWorldBounds(true);
}

function collectPowerup(player, powerup) {
  powerup.destroy();
  poweredUp = true;

  if (powerupTimer) powerupTimer.remove();
  powerupTimer = player.scene.time.delayedCall(5000, () => {
    poweredUp = false;
  });
}

function platformTouched(player, platform) {
  if (player.body.velocity.y > 0 && lastPlatformTouched !== platform) {
    lastPlatformTouched = platform;
    score += 15;
    scoreText.setText('Pontuação: ' + score);
  }
}