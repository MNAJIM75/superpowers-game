interface SceneSettingsResourcePub {
  formatVersion: number;

  defaultCameraMode: string;
  defaultVerticalAxis: string;
  showGridByDefault: boolean;
  [key: string]: any;
}

export default class SceneSettingsResource extends SupCore.Data.Base.Resource {
  static currentFormatVersion = 2;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    defaultCameraMode: { type: "enum", items: [ "3D", "2D" ], mutable: true },
    defaultVerticalAxis: { type: "enum", items: [ "Y", "Z" ], mutable: true },
    showGridByDefault: { type: "boolean", mutable: true }
  };

  pub: SceneSettingsResourcePub;

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, SceneSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      formatVersion: SceneSettingsResource.currentFormatVersion,

      defaultCameraMode: "3D",
      defaultVerticalAxis: "Y",
      showGridByDefault: false
    };

    super.init(callback);
  }

  migrate(resourcePath: string, pub: SceneSettingsResourcePub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === SceneSettingsResource.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: Vertical axis was introduced in Superpowers 0.13
      if (pub.defaultVerticalAxis == null) pub.defaultVerticalAxis = "Y";

      pub.formatVersion = 1;
    }

    if (pub.formatVersion === 1) {
      // NOTE: Show grid by default was introduced in Superpowers 6.0.2
      if (pub.showGridByDefault == null) pub.showGridByDefault = false;

      pub.formatVersion = 2;
    }

    pub.formatVersion = SceneSettingsResource.currentFormatVersion;
    callback(true);
  }
}
