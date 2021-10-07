import engine from "./engine";

const THREE = SupEngine.THREE;

const overlay: {
  scene: THREE.Scene;
  camera: THREE.Camera;

  posXAxisHelper: THREE.Sprite;
  posYAxisHelper: THREE.Sprite;
  posZAxisHelper: THREE.Sprite;
  negXAxisHelper: THREE.Sprite;
  negYAxisHelper: THREE.Sprite;
  negZAxisHelper: THREE.Sprite;
} = <any>{};
export default overlay;

export function createAxes() {
  overlay.scene = new THREE.Scene();
  overlay.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);

  const geometry = new THREE.BoxGeometry( 0.8, 0.05, 0.05 ).translate( 0.4, 0, 0 );
  const xAxis = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: new THREE.Color("#ff3653"), toneMapped: false } ) );
  const yAxis = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: new THREE.Color("#8adb00"), toneMapped: false } ) );
  const zAxis = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: new THREE.Color("#2c8fff"), toneMapped: false } ) );
  yAxis.rotation.z = Math.PI / 2;
  zAxis.rotation.y = - Math.PI / 2;
  overlay.scene.add(xAxis);
  overlay.scene.add(yAxis);
  overlay.scene.add(zAxis);

  overlay.posXAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#ff3653"), "X" ) );
  overlay.posXAxisHelper.userData.type = "posX";
  overlay.posYAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#8adb00"), "Y" ) );
  overlay.posYAxisHelper.userData.type = "posY";
  overlay.posZAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#2c8fff"), "Z" ) );
  overlay.posZAxisHelper.userData.type = "posZ";
  overlay.negXAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#ff3653") ) );
  overlay.negXAxisHelper.userData.type = "negX";
  overlay.negYAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#8adb00") ) );
  overlay.negYAxisHelper.userData.type = "negY";
  overlay.negZAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#2c8fff") ) );
  overlay.negZAxisHelper.userData.type = "negZ";
  overlay.posXAxisHelper.position.x = 1;
  overlay.posYAxisHelper.position.y = 1;
  overlay.posZAxisHelper.position.z = 1;
  overlay.negXAxisHelper.position.x = - 1;
  overlay.negXAxisHelper.scale.setScalar( 0.8 );
  overlay.negYAxisHelper.position.y = - 1;
  overlay.negYAxisHelper.scale.setScalar( 0.8 );
  overlay.negZAxisHelper.position.z = - 1;
  overlay.negZAxisHelper.scale.setScalar( 0.8 );
  overlay.scene.add( overlay.posXAxisHelper );
  overlay.scene.add( overlay.posYAxisHelper );
  overlay.scene.add( overlay.posZAxisHelper );
  overlay.scene.add( overlay.negXAxisHelper );
  overlay.scene.add( overlay.negYAxisHelper );
  overlay.scene.add( overlay.negZAxisHelper );

  let dom = engine.gameInstance.threeRenderer.domElement;
  let interceptor = document.createElement("div");
  dom.parentElement.insertBefore(interceptor, dom);
  interceptor.style.position = "absolute";
  interceptor.style.width = "100px";
  interceptor.style.height = "100px";
  interceptor.style.right = "0";
  interceptor.style.top = "0";

  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster;
  interceptor.addEventListener("mousedown", function ( event ) {
    const rect = engine.gameInstance.threeRenderer.domElement.getBoundingClientRect();
    mouse.x = (event.clientX - (rect.width - 100)) / 50 - 1.0;
    mouse.y = -((event.clientY - rect.top) / 50 - 1.0);

    raycaster.setFromCamera(mouse, overlay.camera);

    const intersects = raycaster.intersectObjects(overlay.scene.children);

    if ( intersects.length > 0 ) {
      const intersection = intersects[ 0 ];
      const object = intersection.object;

      return true;
    } else {
      return false;
    }
  });
}

function getSpriteMaterial( color: THREE.Color, text: string = null ) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext("2d");
  context.beginPath();
  context.arc( 32, 32, 16, 0, 2 * Math.PI );
  context.closePath();
  context.fillStyle = color.getStyle();
  context.fill();

  if (text !== null) {
    context.font = "24px Arial";
    context.textAlign = "center";
    context.fillStyle = "#000000";
    context.fillText( text, 32, 41 );
  }

  return new THREE.SpriteMaterial( { map: new THREE.CanvasTexture(canvas), toneMapped: false } );
}

let viewport = new THREE.Vector4();
const point = new THREE.Vector3();
export function renderOverlay() {
  point.set( 0, 0, 1 );
  point.applyQuaternion(engine.cameraComponent.threeCamera.quaternion);

  if (point.x >= 0) {
    overlay.posXAxisHelper.material.opacity = 1;
    overlay.negXAxisHelper.material.opacity = 0.5;
  } else {
    overlay.posXAxisHelper.material.opacity = 0.5;
    overlay.negXAxisHelper.material.opacity = 1;
  }

  if (point.y >= 0) {
    overlay.posYAxisHelper.material.opacity = 1;
    overlay.negYAxisHelper.material.opacity = 0.5;
  } else {
    overlay.posYAxisHelper.material.opacity = 0.5;
    overlay.negYAxisHelper.material.opacity = 1;
  }

  if (point.z >= 0) {
    overlay.posZAxisHelper.material.opacity = 1;
    overlay.negZAxisHelper.material.opacity = 0.5;
  } else {
    overlay.posZAxisHelper.material.opacity = 0.5;
    overlay.negZAxisHelper.material.opacity = 1;
  }

  engine.gameInstance.threeRenderer.clearDepth();
  engine.gameInstance.threeRenderer.getViewport(viewport);
  engine.gameInstance.threeRenderer.setViewport(viewport.z - 100, viewport.w - 100, 100, 100);
  overlay.camera.setRotationFromQuaternion(engine.cameraComponent.threeCamera.quaternion);
  overlay.camera.position.set(0, 0, 0);
  overlay.camera.translateOnAxis(new THREE.Vector3(0, 0, 1), 5);
  engine.gameInstance.threeRenderer.render(overlay.scene, overlay.camera);
  engine.gameInstance.threeRenderer.setViewport(viewport);
}
