import SceneSettingsResource from "../data/SceneSettingsResource";

export default class SceneSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: SceneSettingsResource;

  defaultCameraModeField: HTMLSelectElement;
  defaultVerticalAxisField: HTMLSelectElement;
  showGridByDefaultField: HTMLInputElement;

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    const { tbody } = SupClient.table.createTable(container);

    const defaultCameraModeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Scene.defaultCameraMode"));
    this.defaultCameraModeField = SupClient.table.appendSelectBox(defaultCameraModeRow.valueCell, { "3D": "3D", "2D": "2D" });

    this.defaultCameraModeField.addEventListener("change", (event: any) => {
      this.projectClient.editResource("sceneSettings", "setProperty", "defaultCameraMode", event.target.value);
    });

    const defaultVerticalAxisRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Scene.defaultCameraVerticalAxis"));
    this.defaultVerticalAxisField = SupClient.table.appendSelectBox(defaultVerticalAxisRow.valueCell, { "Y": "Y", "Z": "Z" });

    this.defaultVerticalAxisField.addEventListener("change", (event: any) => {
      this.projectClient.editResource("sceneSettings", "setProperty", "defaultVerticalAxis", event.target.value);
    });

    const showGridRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Scene.showGridByDefault"));
    this.showGridByDefaultField = SupClient.table.appendBooleanField(showGridRow.valueCell, false);

    this.showGridByDefaultField.addEventListener("change", (event: any) => {
      this.projectClient.editResource("sceneSettings", "setProperty", "showGridByDefault", event.target.checked);
    });

    this.projectClient.subResource("sceneSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: SceneSettingsResource) => {
    this.resource = resource;

    this.defaultCameraModeField.value = resource.pub.defaultCameraMode;
    this.defaultVerticalAxisField.value = resource.pub.defaultVerticalAxis;
    this.showGridByDefaultField.checked = resource.pub.showGridByDefault;
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    switch (propertyName) {
      case "defaultVerticalAxis": this.defaultVerticalAxisField.value = this.resource.pub.defaultVerticalAxis; break;
      case "defaultCameraMode": this.defaultCameraModeField.value = this.resource.pub.defaultCameraMode; break;
      case "showGridByDefault": this.showGridByDefaultField.checked = this.resource.pub.showGridByDefault; break;
    }
  }
}
