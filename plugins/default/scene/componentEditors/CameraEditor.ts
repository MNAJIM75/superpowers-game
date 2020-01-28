import CameraConfig from "../componentConfigs/CameraConfig";

export default class CameraEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  modeSelectBox: HTMLSelectElement;
  fovRowParts: SupClient.table.RowParts;
  fovField: HTMLInputElement;
  orthographicScaleRowParts: SupClient.table.RowParts;
  orthographicScaleField: HTMLInputElement;
  depthField: HTMLInputElement;
  nearClippingPlaneField: HTMLInputElement;
  farClippingPlaneField: HTMLInputElement;
  clearColorField: SupClient.table.ColorField;
  clearOpacityField: HTMLInputElement;
  viewportFields: { x?: HTMLInputElement; y?: HTMLInputElement; width?: HTMLInputElement; height?: HTMLInputElement } = {};

  usePostProcessingField: HTMLInputElement;
  postProcessingRowParts: SupClient.table.RowParts;
  postProcessingList: HTMLDivElement;
  postProcessingLayers: string[];
  newPostProcessFieldSubscriber: SupClient.table.AssetFieldSubscriber;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    const modeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.mode"));
    const modeOptions: { [value: string]: string; } = {
      perspective: SupClient.i18n.t("componentEditors:Camera.modeOptions.perspective"),
      orthographic: SupClient.i18n.t("componentEditors:Camera.modeOptions.orthographic")
    };
    this.modeSelectBox = SupClient.table.appendSelectBox(modeRow.valueCell, modeOptions, config.mode);

    this.fovRowParts = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.fieldOfView"));
    this.fovField = SupClient.table.appendNumberField(this.fovRowParts.valueCell, config.fov, { min: 0.1, max: 179.9, step: 0.1 });

    this.orthographicScaleRowParts = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.orthographicScale"));
    this.orthographicScaleField = SupClient.table.appendNumberField(this.orthographicScaleRowParts.valueCell, config.orthographicScale, { min: 0.1, step: 0.1 });

    if (config.mode === "perspective") this.orthographicScaleRowParts.row.style.display = "none";
    else this.fovRowParts.row.style.display = "none";

    const depthOptions = { title: SupClient.i18n.t("componentEditors:Camera.depthTitle") };
    const depthRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.depth"), depthOptions);
    this.depthField = SupClient.table.appendNumberField(depthRow.valueCell, config.depth);

    const layersOptions = { title: SupClient.i18n.t("componentEditors:Camera.layersTitle") };
    const layersRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.layers"), layersOptions);
    const layersField = SupClient.table.appendTextField(layersRow.valueCell, "");
    layersField.disabled = true;
    layersField.placeholder = "(not yet customizable)";

    const nearClippingPlaneRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.nearPlane"));
    this.nearClippingPlaneField = SupClient.table.appendNumberField(nearClippingPlaneRow.valueCell, config.nearClippingPlane, { min: 0.1 });

    const farClippingPlaneRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.farPlane"));
    this.farClippingPlaneField = SupClient.table.appendNumberField(farClippingPlaneRow.valueCell, config.farClippingPlane, { min: 0.1 });

    const clearColorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.clearColor"));
    this.clearColorField = SupClient.table.appendColorField(clearColorRow.valueCell, config.clearColor);
    const colorOpacityRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.clearOpacity"));
    this.clearOpacityField = SupClient.table.appendNumberField(colorOpacityRow.valueCell, config.clearOpacity, { min: 0.0, max: 1.0 });

    SupClient.table.appendHeader(tbody, SupClient.i18n.t("componentEditors:Camera.viewport.title"));
    const viewportXRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.viewport.position"));
    [ this.viewportFields.x, this.viewportFields.y ] = SupClient.table.appendNumberFields(viewportXRow.valueCell, [ config.viewport.x, config.viewport.y ]
    , { min: 0, max: 1, step: 0.1 });

    const widthRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.viewport.size"));
    [ this.viewportFields.width, this.viewportFields.height ] = SupClient.table.appendNumberFields(widthRow.valueCell, [ config.viewport.width, config.viewport.height ]
    , { min: 0, max: 1, step: 0.1 });

    const usePostProcessingRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.postProcessing.use"));
    this.usePostProcessingField = SupClient.table.appendBooleanField(usePostProcessingRow.valueCell, config.usePostProcessing);

    this.postProcessingRowParts = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Camera.postProcessing.stack"));
    this.postProcessingList = document.createElement("div");
    this.postProcessingList.className = "list";
    this.postProcessingRowParts.valueCell.appendChild(this.postProcessingList);

    if (config.usePostProcessing) this.postProcessingRowParts.row.style.display = "";
    else this.postProcessingRowParts.row.style.display = "none";

    this.postProcessingLayers = [];
    for (let i = 0; i <= config.shaders.length; i++) {
      let field: SupClient.table.AssetFieldSubscriber;

      if (i < config.shaders.length) {
        field = SupClient.table.appendAssetField(this.postProcessingList, config.shaders[i], "shader", projectClient);
        this.postProcessingLayers.push(config.shaders[i]);
      }
      else if (i < CameraConfig.schema["shaders"].maxLength)
        field = SupClient.table.appendAssetField(this.postProcessingList, null, "shader", projectClient);

      if (field)
        field.on("select", (assetId: string) => this.onPostProcessingLayerFieldChange(assetId, i));
    }

    this.modeSelectBox.addEventListener("change", this.onChangeMode);
    this.fovField.addEventListener("input", this.onChangeFOV);
    this.orthographicScaleField.addEventListener("input", this.onChangeOrthographicScale);
    this.depthField.addEventListener("change", this.onChangeDepth);
    this.nearClippingPlaneField.addEventListener("change", this.onChangeNearClippingPlane);
    this.farClippingPlaneField.addEventListener("change", this.onChangeFarClippingPlane);
    this.clearColorField.addListener("change", this.onChangeClearColor);
    this.clearOpacityField.addEventListener("change", this.onChangeClearOpacity);
    this.viewportFields.x.addEventListener("change", this.onChangeViewportX);
    this.viewportFields.y.addEventListener("change", this.onChangeViewportY);
    this.viewportFields.width.addEventListener("change", this.onChangeViewportWidth);
    this.viewportFields.height.addEventListener("change", this.onChangeViewportHeight);
    this.usePostProcessingField.addEventListener("change", this.onChangePostProcessing);
  }

  destroy() { /* Nothing to do */ }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "mode": {
        this.modeSelectBox.value = value;
        this.orthographicScaleRowParts.row.style.display = (value === "perspective") ? "none" : "";
        this.fovRowParts.row.style.display = (value === "perspective") ? "" : "none";
      } break;
      case "fov": { this.fovField.value = value; } break;
      case "orthographicScale": { this.orthographicScaleField.value = value; } break;
      case "depth": { this.depthField.value = value; } break;
      case "nearClippingPlane": { this.nearClippingPlaneField.value = value; } break;
      case "farClippingPlane": { this.farClippingPlaneField.value = value; } break;
      case "viewport.x": { this.viewportFields.x.value = value; } break;
      case "viewport.y": { this.viewportFields.y.value = value; } break;
      case "viewport.width": { this.viewportFields.width.value = value; } break;
      case "viewport.height": { this.viewportFields.height.value = value; } break;
      case "clearColor": { this.clearColorField.setValue(value); } break;
      case "clearOpacity": { this.clearOpacityField.value = value; } break;
      case "usePostProcessing": {
        this.usePostProcessingField.value = value;
        this.postProcessingRowParts.row.style.display = value ? "" : "none";
      } break;
      case "shaders": {
        this.postProcessingList.remove();
        this.postProcessingList = document.createElement("div");
        this.postProcessingList.className = "list";
        this.postProcessingRowParts.valueCell.appendChild(this.postProcessingList);

        this.postProcessingLayers = [];
        for (let i = 0; i <= value.length; i++) {
          let field: SupClient.table.AssetFieldSubscriber;

          if (i < value.length) {
            field = SupClient.table.appendAssetField(this.postProcessingList, value[i], "shader", this.projectClient);
            this.postProcessingLayers.push(value[i]);
          }
          else if (i < CameraConfig.schema["shaders"].maxLength)
            field = SupClient.table.appendAssetField(this.postProcessingList, null, "shader", this.projectClient);

          if (field)
            field.on("select", (assetId: string) => this.onPostProcessingLayerFieldChange(assetId, i));
        }
      } break;
    }
  }

  private onChangeMode = (event: any) => { this.editConfig("setProperty", "mode", event.target.value); };
  private onChangeFOV = (event: any) => { this.editConfig("setProperty", "fov", parseFloat(event.target.value)); };
  private onChangeOrthographicScale = (event: any) => { this.editConfig("setProperty", "orthographicScale", parseFloat(event.target.value)); };
  private onChangeDepth = (event: any) => { this.editConfig("setProperty", "depth", parseFloat(event.target.value)); };
  private onChangeNearClippingPlane = (event: any) => { this.editConfig("setProperty", "nearClippingPlane", parseFloat(event.target.value)); };
  private onChangeFarClippingPlane = (event: any) => { this.editConfig("setProperty", "farClippingPlane", parseFloat(event.target.value)); };
  private onChangeClearColor = (color: any) => { this.editConfig("setProperty", "clearColor", color); };
  private onChangeClearOpacity = (event: any) => { this.editConfig("setProperty", "clearOpacity", parseFloat(event.target.value)); };
  private onChangeViewportX = (event: any) => { this.editConfig("setProperty", "viewport.x", parseFloat(event.target.value)); };
  private onChangeViewportY = (event: any) => { this.editConfig("setProperty", "viewport.y", parseFloat(event.target.value)); };
  private onChangeViewportWidth = (event: any) => { this.editConfig("setProperty", "viewport.width", parseFloat(event.target.value)); };
  private onChangeViewportHeight = (event: any) => { this.editConfig("setProperty", "viewport.height", parseFloat(event.target.value)); };
  private onChangePostProcessing = (event: any) => { this.editConfig("setProperty", "usePostProcessing", event.target.checked); };
  private onPostProcessingLayerFieldChange = (assetId: string, index: number) => {
    if (index > this.postProcessingLayers.length) return;

    if (index === this.postProcessingLayers.length) {
      if (assetId === null) return;
      this.postProcessingLayers.push(assetId);

    } else {
      if (assetId === null) {
        if (index === this.postProcessingLayers.length - 1) {
          this.postProcessingLayers.pop();
        } else {
          this.postProcessingLayers.splice(index, 1);
        }
      } else {
        this.postProcessingLayers[index] = assetId;
      }
    }

    this.editConfig("setProperty", "shaders", this.postProcessingLayers);
  }
}
