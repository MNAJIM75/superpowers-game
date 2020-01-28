export interface CameraConfigPub {
  formatVersion: number;

  mode: string;
  fov: number;
  orthographicScale: number;
  viewport: { x: number; y: number; width: number; height: number; };
  depth: number;
  usePostProcessing: boolean;
  shaders: Array<string>;
  nearClippingPlane: number;
  farClippingPlane: number;
  clearColor: string;
  clearOpacity: number;
}

export default class CameraConfig extends SupCore.Data.Base.ComponentConfig {

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    mode: { type: "enum", items: [ "perspective", "orthographic" ], mutable: true },
    fov: { type: "number", min: 0.1, max: 179.9, mutable: true },
    orthographicScale: { type: "number", min: 0.1, mutable: true },
    viewport: {
      type: "hash",
      properties: {
        x: { type: "number", min: 0, max: 1, mutable: true },
        y: { type: "number", min: 0, max: 1, mutable: true },
        width: { type: "number", min: 0, max: 1, mutable: true },
        height: { type: "number", min: 0, max: 1, mutable: true },
      }
    },
    depth: { type: "number", mutable: true },
    usePostProcessing: { type: "boolean", mutable: true },
    shaders: {
      type: "array", mutable: true, minLength: 0, maxLength: 8,
      items: { type: "string?", min: 0, mutable: true }
    },
    nearClippingPlane: { type: "number", min: 0.1, mutable: true },
    farClippingPlane: { type: "number", min: 0.1, mutable: true },
    clearColor: { type: "string", length: 6, mutable: true },
    clearOpacity: { type: "number", min: 0.0, max: 1.0, mutable: true },
  };

  static create() {
    const emptyConfig: CameraConfigPub = {
      formatVersion: CameraConfig.currentFormatVersion,

      mode: "perspective",
      fov: 45,
      orthographicScale: 10,
      viewport: { x: 0, y: 0, width: 1, height: 1 },
      depth: 0,
      usePostProcessing: false,
      shaders: [],
      nearClippingPlane: 0.1,
      farClippingPlane: 1000,
      clearColor: "000000",
      clearOpacity: 1
    };
    return emptyConfig;
  }

  static currentFormatVersion = 1.2;
  static migrate(pub: CameraConfigPub) {
    if (pub.formatVersion === CameraConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;

      // NOTE: New setting introduced in v0.8
      if (pub.depth == null) pub.depth = 0;
      // NOTE: New settings introduced in v0.7
      if (pub.nearClippingPlane == null) pub.nearClippingPlane = 0.1;
      if (pub.farClippingPlane == null) pub.farClippingPlane = 1000;
    }

    if (pub.formatVersion < 1.1) {
      pub.formatVersion = 1.1;
      if (pub.usePostProcessing == null)
        pub.usePostProcessing = false;
      if (pub.shaders == null)
        pub.shaders = [];
    }

    if (pub.formatVersion < 1.2) {
      pub.formatVersion = 1.2;
      if (pub.clearColor == null) pub.clearColor = "000000";
      if (pub.clearOpacity == null) pub.clearOpacity = 1;
    }

    return true;
  }

  pub: CameraConfigPub;
  constructor(pub: CameraConfigPub) { super(pub, CameraConfig.schema); }
}
