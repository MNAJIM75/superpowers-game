const THREE = SupEngine.THREE;

export default class SkyHelper extends SupEngine.ActorComponent {
  skyMesh: THREE.Mesh;
  visible = true;

  constructor(actor: SupEngine.Actor) {
    super(actor, "SkyHelper");

    this.setup();
  }

  setIsLayerActive(active: boolean) { this.skyMesh.visible = active && this.visible; }

  setup() {
    if (this.skyMesh != null) {
      this.actor.threeObject.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      (this.skyMesh.material as THREE.Material).dispose();
    }

    const skyGeo = new THREE.SphereGeometry(500);
    const skyMat = new THREE.RawShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x8d8d8d) },
        bottomColor: { value: new THREE.Color(0x424242) },
        skyTopColor: { value: new THREE.Color(0x0077ff) },
        skyBottomColor: { value: new THREE.Color(0xfbf4e7) },
        exponent: { value: 0.5 }
      },
      vertexShader:
`precision mediump float;
precision mediump int;
#define SHADER_NAME SkyShader
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader:
`precision mediump float;
precision mediump int;
#define SHADER_NAME SkyShader
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform vec3 skyTopColor;
uniform vec3 skyBottomColor;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize(vWorldPosition).y;
  // gl_FragColor = vec4(mix(skyBottomColor, skyTopColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
  gl_FragColor = vec4(mix(bottomColor, topColor, h / 2.0 + 0.5), 1.0);
}`,
      side: THREE.BackSide
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.actor.threeObject.add(this.skyMesh);
  }

  setVisible(visible: boolean) {
    this.skyMesh.visible = this.visible = visible;
  }
}
