import engine from "./engine";

const THREE = SupEngine.THREE;

const overlay: {
  scene: THREE.Scene;
  camera: THREE.Camera;
} = <any>{};
export default overlay;

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

const posXAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#ff3653"), "X" ) );
posXAxisHelper.userData.type = "posX";
const posYAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#8adb00"), "Y" ) );
posYAxisHelper.userData.type = "posY";
const posZAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#2c8fff"), "Z" ) );
posZAxisHelper.userData.type = "posZ";
const negXAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#ff3653") ) );
negXAxisHelper.userData.type = "negX";
const negYAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#8adb00") ) );
negYAxisHelper.userData.type = "negY";
const negZAxisHelper = new THREE.Sprite( getSpriteMaterial( new THREE.Color("#2c8fff") ) );
negZAxisHelper.userData.type = "negZ";
posXAxisHelper.position.x = 1;
posYAxisHelper.position.y = 1;
posZAxisHelper.position.z = 1;
negXAxisHelper.position.x = - 1;
negXAxisHelper.scale.setScalar( 0.8 );
negYAxisHelper.position.y = - 1;
negYAxisHelper.scale.setScalar( 0.8 );
negZAxisHelper.position.z = - 1;
negZAxisHelper.scale.setScalar( 0.8 );
overlay.scene.add( posXAxisHelper );
overlay.scene.add( posYAxisHelper );
overlay.scene.add( posZAxisHelper );
overlay.scene.add( negXAxisHelper );
overlay.scene.add( negYAxisHelper );
overlay.scene.add( negZAxisHelper );

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

// need to add a DOM element on top of the canvas to stop propagation
/*const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster;
let dom = engine.gameInstance.threeRenderer.domElement;
dom.addEventListener("mousedown", function ( event ) {
  const rect = engine.gameInstance.threeRenderer.domElement.getBoundingClientRect();
  mouse.x = (event.clientX - (rect.width - 100)) / 50 - 1.0;
  mouse.y = -((event.clientY - rect.top) / 50 - 1.0);

  raycaster.setFromCamera(mouse, engine.cameraOverlay);

  const intersects = raycaster.intersectObjects(engine.overlayScene.children);

  if ( intersects.length > 0 ) {
    const intersection = intersects[ 0 ];
    const object = intersection.object;

    console.log(object.userData);
    event.stopPropagation();

    return true;
  } else {
    return false;
  }
});*/

let viewport = new THREE.Vector4();
export function renderOverlay() {
  engine.gameInstance.threeRenderer.clearDepth();
  engine.gameInstance.threeRenderer.getViewport(viewport);
  engine.gameInstance.threeRenderer.setViewport(viewport.z - 100, viewport.w - 100, 100, 100);
  overlay.camera.setRotationFromQuaternion(engine.cameraComponent.threeCamera.quaternion);
  overlay.camera.position.set(0, 0, 0);
  overlay.camera.translateOnAxis(new THREE.Vector3(0, 0, 1), 5);
  engine.gameInstance.threeRenderer.render(overlay.scene, overlay.camera);
  engine.gameInstance.threeRenderer.setViewport(viewport);
}
