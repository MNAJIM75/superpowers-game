import { data } from "./network";
import engine, { setupHelpers, updateCameraMode, focusActor } from "./engine";

import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";
import * as sceneUserSettings from "../../data/SceneUserSettings";

import * as TreeView from "dnd-tree-view";
import * as ResizeHandle from "resize-handle";

const THREE = SupEngine.THREE;

const ui: {
  canvasElt: HTMLCanvasElement;
  treeViewElt: HTMLDivElement;
  nodesTreeView: TreeView;

  newActorButton: HTMLButtonElement;
  newPrefabButton: HTMLButtonElement;
  renameNodeButton: HTMLButtonElement;
  duplicateNodeButton: HTMLButtonElement;
  deleteNodeButton: HTMLButtonElement;

  inspectorElt: HTMLDivElement;
  inspectorTbodyElt: HTMLTableSectionElement;

  transform: {
    positionElts: HTMLInputElement[];
    orientationElts: HTMLInputElement[];
    scaleElts: HTMLInputElement[];
  };

  visibleCheckbox: HTMLInputElement;
  layerSelect: HTMLSelectElement;
  prefabRow: HTMLTableRowElement;
  prefabInput: HTMLInputElement;
  prefabSelectElt: HTMLButtonElement;

  availableComponents: { [name: string]: string };
  componentEditors: { [id: string]: {
    destroy(): void;
    config_setProperty(path: string, value: any): void;
  } };
  newComponentButton: HTMLButtonElement;
  componentsElt: HTMLDivElement;

  cameraMode: string;
  cameraModeButton: HTMLButtonElement;
  cameraVerticalAxis: string;
  cameraVerticalAxisButton: HTMLButtonElement;
  cameraSpeedSlider: HTMLInputElement;
  camera2DZ: HTMLInputElement;

  gridCheckbox: HTMLInputElement;
  gridSize: number;
  gridStep: number;

  dropTimeout: NodeJS.Timer;
  actorDropElt: HTMLDivElement;
  componentDropElt: HTMLDivElement;
} = {} as any;
export default ui;

// Hotkeys
document.addEventListener("keydown", (event) => {
  if (document.querySelector(".dialog") != null) return;
  let activeElement = document.activeElement as HTMLElement;
  while (activeElement != null) {
    if (activeElement === ui.canvasElt || activeElement === ui.treeViewElt) break;
    activeElement = activeElement.parentElement;
  }
  if (activeElement == null) return;

  if ((event.ctrlKey || event.metaKey) && event.key === "n") {
    event.preventDefault();
    event.stopPropagation();
    onNewNodeClick();
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "p") {
    event.preventDefault();
    event.stopPropagation();
    onNewPrefabClick();
  }

  if (event.key === "F2") {
    event.preventDefault();
    event.stopPropagation();
    onRenameNodeClick();
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "d") {
    event.preventDefault();
    event.stopPropagation();
    onDuplicateNodeClick();
  }

  if (event.key === "Delete") {
    event.preventDefault();
    event.stopPropagation();
    onDeleteNodeClick();
  }
});

const ignoredTagNames = [ "INPUT", "TEXTAREA", "SELECT", "BUTTON" ];
document.addEventListener("keydown", (event) => {
  if (document.querySelector("body > .dialog") != null) return;
  if (ignoredTagNames.indexOf((event.target as HTMLInputElement).tagName) !== -1) return;

  switch (event.key) {
    case "e":
      setMode("translate");
      break;
    case "r":
      setMode("rotate");
      break;
    case "t":
      setMode("scale");
      break;
    case "l":
      const localElt = document.getElementById(`transform-space`) as HTMLInputElement;
      localElt.checked = !localElt.checked;
      engine.transformHandleComponent.setSpace(localElt.checked ? "local" : "world");
      break;

    case "g":
      ui.gridCheckbox.checked = !ui.gridCheckbox.checked;
      engine.gridHelperComponent.setVisible(ui.gridCheckbox.checked);
      break;

    case "f":
      if (ui.nodesTreeView.selectedNodes.length !== 1) return;
      const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
      focusActor(nodeId);
      break;
  }
});

ui.canvasElt = document.querySelector("canvas") as HTMLCanvasElement;
ui.actorDropElt = document.querySelector(".render-area .drop-asset-container") as HTMLDivElement;
ui.componentDropElt = document.querySelector(".transform-area .drop-asset-container") as HTMLDivElement;

// Setup resizable panes
new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "right");
new ResizeHandle(document.querySelector(".nodes-tree-view") as HTMLElement, "top");

// Setup tree view
ui.treeViewElt = document.querySelector(".nodes-tree-view") as HTMLDivElement;
ui.nodesTreeView = new TreeView(ui.treeViewElt, { dragStartCallback: () => true, dropCallback: onNodesTreeViewDrop });
ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

ui.newActorButton = document.querySelector("button.new-actor") as HTMLButtonElement;
ui.newActorButton.addEventListener("click", onNewNodeClick);
ui.newPrefabButton = document.querySelector("button.new-prefab") as HTMLButtonElement;
ui.newPrefabButton.addEventListener("click", onNewPrefabClick);
ui.renameNodeButton = document.querySelector("button.rename-node") as HTMLButtonElement;
ui.renameNodeButton.addEventListener("click", onRenameNodeClick);
ui.duplicateNodeButton = document.querySelector("button.duplicate-node") as HTMLButtonElement;
ui.duplicateNodeButton.addEventListener("click", onDuplicateNodeClick);
ui.deleteNodeButton = document.querySelector("button.delete-node") as HTMLButtonElement;
ui.deleteNodeButton.addEventListener("click", onDeleteNodeClick);

// Inspector
ui.inspectorElt = document.querySelector(".inspector") as HTMLDivElement;
ui.inspectorTbodyElt = ui.inspectorElt.querySelector("tbody") as HTMLTableSectionElement;

ui.transform = {
  positionElts: ui.inspectorElt.querySelectorAll(".transform .position input") as any,
  orientationElts: ui.inspectorElt.querySelectorAll(".transform .orientation input") as any,
  scaleElts: ui.inspectorElt.querySelectorAll(".transform .scale input") as any,
};

ui.visibleCheckbox = ui.inspectorElt.querySelector(".visible input") as HTMLInputElement;
ui.visibleCheckbox.addEventListener("change", onVisibleChange);

ui.layerSelect = ui.inspectorElt.querySelector(".layer select") as HTMLSelectElement;
ui.layerSelect.addEventListener("change", onLayerChange);

ui.prefabRow = ui.inspectorElt.querySelector(".prefab") as HTMLTableRowElement;
ui.prefabInput = ui.inspectorElt.querySelector(".prefab input") as HTMLInputElement;
ui.prefabInput.addEventListener("click", (event) => {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  if (data.sceneUpdater.sceneAsset.nodes.byId[nodeId].prefab.sceneAssetId != null) {
    SupClient.openEntry(data.sceneUpdater.sceneAsset.nodes.byId[nodeId].prefab.sceneAssetId);
  } else {
    new SupClient.Dialogs.FindAssetDialog(
      data.projectClient.entries,
      { "scene" : { pluginPath: "default/scene" } },
      (assetId) => {
        if (assetId != null) data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", assetId);
      });
  }
});

ui.prefabInput.addEventListener("dragover", (event) => {
  event.preventDefault();
});
ui.prefabInput.addEventListener("drop", (event) => {
  const entryId = event.dataTransfer.getData("application/vnd.superpowers.entry").split(",")[0];
  if (typeof entryId !== "string") return;

  const entry = data.projectClient.entries.byId[entryId];
  if (entry == null || entry.type !== "scene") return;

  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id);
});

ui.prefabSelectElt = ui.inspectorElt.querySelector(".prefab button") as HTMLButtonElement;
ui.prefabSelectElt.addEventListener("click", (event) => {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  if (data.sceneUpdater.sceneAsset.nodes.byId[nodeId].prefab.sceneAssetId != null) {
    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", null);
    return;
  }
  new SupClient.Dialogs.FindAssetDialog(
    data.projectClient.entries,
    { "scene" : { pluginPath: "default/scene" } },
    (assetId) => {
      if (assetId != null) data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", assetId);
    });
});

for (const transformType in ui.transform) {
  const inputs: HTMLInputElement[] = (ui.transform as any)[transformType];
  for (const input of inputs) input.addEventListener("change", onTransformInputChange);
}

ui.newComponentButton = document.querySelector("button.new-component") as HTMLButtonElement;
ui.newComponentButton.addEventListener("click", onNewComponentClick);

ui.cameraMode = "3D";
ui.cameraModeButton = document.getElementById("toggle-camera-button") as HTMLButtonElement;
ui.cameraModeButton.addEventListener("click", onChangeCameraMode);

ui.cameraVerticalAxis = "Y";
ui.cameraVerticalAxisButton = document.getElementById("toggle-camera-vertical-axis") as HTMLButtonElement;
ui.cameraVerticalAxisButton.addEventListener("click", onChangeCameraVerticalAxis);


ui.cameraSpeedSlider = document.getElementById("camera-speed-slider") as HTMLInputElement;
ui.cameraSpeedSlider.addEventListener("input", onChangeCameraSpeed);
ui.cameraSpeedSlider.value = engine.cameraControls.movementSpeed;

ui.camera2DZ = document.getElementById("camera-2d-z") as HTMLInputElement;
ui.camera2DZ.addEventListener("input", onChangeCamera2DZ);

document.querySelector(".main .render-area .transform-mode").addEventListener("click", onTransformModeClick);

ui.componentsElt = ui.inspectorElt.querySelector(".components") as HTMLDivElement;
ui.availableComponents = {};

let componentEditorPlugins: { [pluginName: string]: { path: string; content: SupClient.ComponentEditorPlugin; } };

export function start() {
  componentEditorPlugins = SupClient.getPlugins<SupClient.ComponentEditorPlugin>("componentEditors");
  SupClient.setupHelpCallback(() => {
      window.parent.postMessage({ type: "openTool", name: "documentation", state: { section: "scene" } }, window.location.origin);
  });

  const componentTypes = Object.keys(componentEditorPlugins);
  componentTypes.sort((a, b) => {
    const componentLabelA = SupClient.i18n.t(`componentEditors:${a}.label`);
    const componentLabelB = SupClient.i18n.t(`componentEditors:${b}.label`);
    return componentLabelA.localeCompare(componentLabelB);
  });
  for (const componentType of componentTypes) ui.availableComponents[componentType] = SupClient.i18n.t(`componentEditors:${componentType}.label`);

  document.addEventListener("dragover", onDragOver);
  document.addEventListener("drop", onStopDrag);
  ui.actorDropElt.addEventListener("dragenter", onActorDragEnter);
  ui.actorDropElt.addEventListener("dragleave", onActorDragLeave);
  ui.actorDropElt.addEventListener("drop", onActorDrop);
  ui.componentDropElt.addEventListener("dragenter", onComponentDragEnter);
  ui.componentDropElt.addEventListener("dragleave", onComponentDragLeave);
  ui.componentDropElt.addEventListener("drop", onComponentDrop);

  (document.querySelector(".main .loading") as HTMLDivElement).hidden = true;
  (document.querySelector(".main .controls") as HTMLDivElement).hidden = false;
  (document.querySelector(".render-area") as HTMLDivElement).hidden = false;
  ui.newActorButton.disabled = false;
  ui.newPrefabButton.disabled = false;

  ui.gridCheckbox.checked = sceneUserSettings.pub.showGridByDefault;
  engine.gridHelperComponent.setVisible(ui.gridCheckbox.checked);

  ui.gridStep = sceneUserSettings.pub.defaultGridSize;
  (document.getElementById("grid-step") as HTMLInputElement).value = ui.gridStep.toString();
  engine.gridHelperComponent.setup(ui.gridSize, ui.gridStep);

  sceneUserSettings.emitter.on("controlSchemes", () => {
    engine.cameraControls.changeMode(sceneUserSettings.pub.controlSchemes);
  });
}

function setMode(mode: string) {
  const transformSpaceCheckbox = document.getElementById("transform-space") as HTMLInputElement;
  transformSpaceCheckbox.disabled = mode === "scale";
  engine.transformHandleComponent.setMode(mode);

  (document.getElementById(`transform-mode-translate`) as HTMLInputElement).classList.remove("selected");
  (document.getElementById(`transform-mode-rotate`) as HTMLInputElement).classList.remove("selected");
  (document.getElementById(`transform-mode-scale`) as HTMLInputElement).classList.remove("selected");
  (document.getElementById(`transform-mode-` + mode) as HTMLInputElement).classList.add("selected");
}

// Transform
function onTransformModeClick(event: any) {
  if (event.target.tagName !== "INPUT" && event.target.tagName !== "BUTTON") return;

  if (event.target.id === "transform-space")
    engine.transformHandleComponent.setSpace(event.target.checked ? "local" : "world");
  else
    setMode(event.target.value);
}

// Grid
ui.gridCheckbox = document.getElementById("grid-visible") as HTMLInputElement;
ui.gridCheckbox.addEventListener("change", onGridVisibleChange);
ui.gridSize = 80;
ui.gridStep = 1;
document.getElementById("grid-step").addEventListener("input", onGridStepInput);

function onGridStepInput(event: UIEvent) {
  const target = event.target as HTMLInputElement;
  let value = parseFloat(target.value);
  if (value !== 0 && value < 0.0001) { value = 0; target.value = "0"; }
  if (isNaN(value) || value <= 0) { (target as any).reportValidity(); return; }

  ui.gridStep = value;
  engine.gridHelperComponent.setup(ui.gridSize, ui.gridStep);
}

function onGridVisibleChange(event: UIEvent) {
  engine.gridHelperComponent.setVisible((event.target as HTMLInputElement).checked);
}

// Light
document.getElementById("show-light").addEventListener("change", (event: any) => {
  if (event.target.checked) engine.gameInstance.threeScene.add(engine.ambientLight);
  else engine.gameInstance.threeScene.remove(engine.ambientLight);
});

export function createNodeElement(node: Node) {
  const liElt = document.createElement("li");
  liElt.dataset["id"] = node.id;

  const nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  if (node.prefab != null) nameSpan.classList.add("prefab");
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  const visibleButton = document.createElement("button");
  visibleButton.textContent = SupClient.i18n.t("sceneEditor:treeView.visible.hide");
  visibleButton.classList.add("show");
  visibleButton.addEventListener("click", (event: any) => {
    event.stopPropagation();
    const actor = data.sceneUpdater.bySceneNodeId[event.target.parentElement.dataset["id"]].actor;
    actor.threeObject.visible = !actor.threeObject.visible;
    const visible = actor.threeObject.visible ? "hide" : "show";
    visibleButton.textContent = SupClient.i18n.t(`sceneEditor:treeView.visible.${visible}`);
    if (actor.threeObject.visible) visibleButton.classList.add("show");
    else visibleButton.classList.remove("show");
  });
  liElt.appendChild(visibleButton);

  return liElt;
}

function onNodesTreeViewDrop(event: DragEvent, dropLocation: TreeView.DropLocation, orderedNodes: HTMLLIElement[]) {
  if (orderedNodes == null) return false;

  const dropPoint = SupClient.getTreeViewDropPoint(dropLocation, data.sceneUpdater.sceneAsset.nodes);

  const nodeIds: string[] = [];
  for (const node of orderedNodes ) nodeIds.push(node.dataset["id"]);

  const sourceParentNode = data.sceneUpdater.sceneAsset.nodes.parentNodesById[nodeIds[0]];
  const sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.sceneUpdater.sceneAsset.nodes.pub;
  const sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (const id of nodeIds) {
    data.projectClient.editAsset(SupClient.query.asset, "moveNode", id, dropPoint.parentId, dropPoint.index + i);
    if (!sameParent || sourceChildren.indexOf(data.sceneUpdater.sceneAsset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false;
}

function onNodeActivate() {
  // Focus an actor by double clicking on treeview
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;
  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  focusActor(nodeId);
}

export function setupSelectedNode() {
  setupHelpers();

  // Clear component editors
  for (const componentId in ui.componentEditors) ui.componentEditors[componentId].destroy();
  ui.componentEditors = {};

  // Setup transform
  const nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt == null || ui.nodesTreeView.selectedNodes.length !== 1) {
    ui.inspectorElt.hidden = true;

    ui.newActorButton.disabled = false;
    ui.newPrefabButton.disabled = false;
    ui.renameNodeButton.disabled = true;
    ui.duplicateNodeButton.disabled = true;
    ui.deleteNodeButton.disabled = true;
    return;
  }

  ui.inspectorElt.hidden = false;

  const node = data.sceneUpdater.sceneAsset.nodes.byId[nodeElt.dataset["id"]];
  setInspectorPosition(node.position as THREE.Vector3);
  setInspectorOrientation(new THREE.Quaternion(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w));
  setInspectorScale(node.scale as THREE.Vector3);

  ui.visibleCheckbox.checked = node.visible;
  ui.layerSelect.value = node.layer.toString();

  // If it's a prefab, disable various buttons
  const isPrefab = node.prefab != null;
  ui.newActorButton.disabled = isPrefab;
  ui.newPrefabButton.disabled = isPrefab;
  ui.renameNodeButton.disabled = false;
  ui.duplicateNodeButton.disabled = false;
  ui.deleteNodeButton.disabled = false;

  if (isPrefab) {
    if (ui.prefabRow.parentElement == null) ui.inspectorTbodyElt.appendChild(ui.prefabRow);
    setInspectorPrefabScene(node.prefab.sceneAssetId);
  } else if (ui.prefabRow.parentElement != null) ui.inspectorTbodyElt.removeChild(ui.prefabRow);

  // Setup component editors
  ui.componentsElt.innerHTML = "";

  for (const component of node.components) {
    const componentElt = createComponentElement(node.id, component);
    ui.componentsElt.appendChild(componentElt);
  }
  ui.newComponentButton.disabled = isPrefab;
}

function roundForInspector(number: number) { return parseFloat(number.toFixed(3)); }

export function setInspectorPosition(position: THREE.Vector3) {
  const values = [
    roundForInspector(position.x).toString(),
    roundForInspector(position.y).toString(),
    roundForInspector(position.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.positionElts[i].value !== values[i]) {
      ui.transform.positionElts[i].value = values[i];
    }
  }
}

export function setInspectorOrientation(orientation: THREE.Quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(orientation);

  const values = [
    roundForInspector(THREE.Math.radToDeg(euler.x)).toString(),
    roundForInspector(THREE.Math.radToDeg(euler.y)).toString(),
    roundForInspector(THREE.Math.radToDeg(euler.z)).toString()
  ];

  // Work around weird conversion from quaternion to euler conversion
  if (values[1] === "180" && values[2] === "180") {
    values[0] = roundForInspector(180 - THREE.Math.radToDeg(euler.x)).toString();
    values[1] = "0";
    values[2] = "0";
  }

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.orientationElts[i].value !== values[i]) {
      ui.transform.orientationElts[i].value = values[i];
    }
  }
}

export function setInspectorScale(scale: THREE.Vector3) {
  const values = [
    roundForInspector(scale.x).toString(),
    roundForInspector(scale.y).toString(),
    roundForInspector(scale.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.scaleElts[i].value !== values[i]) {
      ui.transform.scaleElts[i].value = values[i];
    }
  }
}

export function setInspectorVisible(visible: boolean) {
  ui.visibleCheckbox.checked = visible;
}

export function setInspectorLayer(layer: number) {
  ui.layerSelect.value = layer.toString();
}

export function setupInspectorLayers() {
  while (ui.layerSelect.childElementCount > data.gameSettingsResource.pub.customLayers.length + 1) ui.layerSelect.removeChild(ui.layerSelect.lastElementChild);

  let optionElt = ui.layerSelect.firstElementChild.nextElementSibling as HTMLOptionElement;
  for (let i = 0; i < data.gameSettingsResource.pub.customLayers.length; i++) {
    if (optionElt == null) {
      optionElt = document.createElement("option");
      ui.layerSelect.appendChild(optionElt);
    }
    optionElt.value = (i + 1).toString(); // + 1 because "Default" is 0
    optionElt.textContent = data.gameSettingsResource.pub.customLayers[i];

    optionElt = optionElt.nextElementSibling as HTMLOptionElement;
  }
}

export function setInspectorPrefabScene(sceneAssetId: string) {
  if (sceneAssetId != null && data.projectClient.entries.byId[sceneAssetId] != null) {
    ui.prefabInput.value = data.projectClient.entries.getPathFromId(sceneAssetId);
    ui.prefabSelectElt.textContent = SupClient.i18n.t(`common:actions.clear`);
  } else {
    ui.prefabInput.value = "";
    ui.prefabSelectElt.textContent = SupClient.i18n.t(`common:actions.select`);
  }
}

function onNewNodeClick() {
  const options = {
    initialValue: SupClient.i18n.t("sceneEditor:treeView.newActor.initialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.newActor.prompt"), options, (name) => {
    if (name == null) return;
    createNewNode(name, false);
  });
}

function onNewPrefabClick() {
  const options = {
    initialValue: SupClient.i18n.t("sceneEditor:treeView.newPrefab.initialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.newPrefab.prompt"), options, (name) => {
    if (name == null) return;
    createNewNode(name, true);
  });
}

function createNewNode(name: string, prefab: boolean) {
  const options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

  const offset = new THREE.Vector3(0, 0, -10).applyQuaternion(engine.cameraActor.getGlobalOrientation(new THREE.Quaternion()));
  const position = new THREE.Vector3();
  engine.cameraActor.getGlobalPosition(position).add(offset);

  if (options.parentId != null) {
    const parentMatrix = data.sceneUpdater.bySceneNodeId[options.parentId].actor.getGlobalMatrix(new THREE.Matrix4());
    position.applyMatrix4(parentMatrix.getInverse(parentMatrix));
  }
  (options as any).transform = { position };
  (options as any).prefab = prefab;

  data.projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (nodeId: string) => {
    ui.nodesTreeView.clearSelection();
    ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement);
    setupSelectedNode();
  });
}

function onRenameNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const selectedNode = ui.nodesTreeView.selectedNodes[0];
  const node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset["id"]];

  const options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.rename"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.renamePrompt"), options, (newName) => {
    if (newName == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", node.id, "name", newName);
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const selectedNode = ui.nodesTreeView.selectedNodes[0];
  const node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset["id"]];

  const options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.duplicatePrompt"), options, (newName) => {
    if (newName == null) return;
    const options = SupClient.getTreeViewSiblingInsertionPoint(ui.nodesTreeView);

    data.projectClient.editAsset(SupClient.query.asset, "duplicateNode", newName, node.id, options.index, (nodeId: string) => {
      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement);
      setupSelectedNode();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;

  const confirmLabel = SupClient.i18n.t("sceneEditor:treeView.deleteConfirm");
  const validationLabel = SupClient.i18n.t("common:actions.delete");
  new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    if (!confirm) return;

    for (const selectedNode of ui.nodesTreeView.selectedNodes) {
      data.projectClient.editAsset(SupClient.query.asset, "removeNode", selectedNode.dataset["id"]);
    }
  });
}

function onTransformInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const transformType = event.target.parentElement.parentElement.parentElement.className;
  const inputs: HTMLInputElement[] = (ui.transform as any)[`${transformType}Elts`];

  let value: { x: number; y: number; z: number; w?: number } = {
    x: parseFloat(inputs[0].value),
    y: parseFloat(inputs[1].value),
    z: parseFloat(inputs[2].value),
  };

  if (transformType === "orientation") {
    const euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
  }
  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, transformType, value);
}

function onVisibleChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "visible", event.target.checked);
}

function onLayerChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "layer", parseInt(event.target.value, 10));
}

function onPrefabInput(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  if (event.target.value === "") {
    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", null);
  }
  else {
    const entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.target.value);
    if (entry != null && entry.type === "scene") {
      data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id);
    }
  }
}

export function createComponentElement(nodeId: string, component: Component) {
  const componentElt = document.createElement("div");
  componentElt.dataset["componentId"] = component.id;

  const template = document.getElementById("component-cartridge-template") as HTMLElement;
  const clone = document.importNode((template as any).content, true) as HTMLElement;

  clone.querySelector(".type").textContent = SupClient.i18n.t(`componentEditors:${component.type}.label`);
  const table = clone.querySelector(".settings") as HTMLElement;

  const editConfig = (command: string, ...args: any[]) => {
    let callback = (err: string) => {
      if (err != null) new SupClient.Dialogs.InfoDialog(err);
    };

    // Override callback if one is given
    let lastArg = args[args.length - 1];
    if (typeof lastArg === "function") callback = args.pop();

    // Prevent setting a NaN value
    if (command === "setProperty" && typeof args[1] === "number" && isNaN(args[1])) return;

    data.projectClient.editAsset(SupClient.query.asset, "editComponent", nodeId, component.id, command, ...args, callback);
  };
  const componentEditorPlugin = componentEditorPlugins[component.type].content;
  ui.componentEditors[component.id] = new componentEditorPlugin(table.querySelector("tbody") as HTMLTableSectionElement, component.config, data.projectClient, editConfig);

  const shrinkButton = clone.querySelector(".shrink-component");
  shrinkButton.addEventListener("click", () => {
    if (table.style.display === "none") {
      table.style.display = "";
      shrinkButton.textContent = "–";
    } else {
      table.style.display = "none";
      shrinkButton.textContent = "+";
    }
  });

  clone.querySelector(".delete-component").addEventListener("click", onDeleteComponentClick);

  componentElt.appendChild(clone);
  return componentElt;
}

function onNewComponentClick() {
  const selectLabel = SupClient.i18n.t("sceneEditor:inspector.newComponent.select");
  const validationLabel = SupClient.i18n.t("sceneEditor:inspector.newComponent.validate");
  new SupClient.Dialogs.SelectDialog(selectLabel, ui.availableComponents, { validationLabel, size: 12 }, (type) => {
    if (type == null) return;

    const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

    data.projectClient.editAsset(SupClient.query.asset, "addComponent", nodeId, type, null);
  });
}

function onDeleteComponentClick(event: any) {
  const confirmLabel = SupClient.i18n.t("sceneEditor:inspector.deleteComponent.confirm");
  const validationLabel = SupClient.i18n.t("sceneEditor:inspector.deleteComponent.validate");
  new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    if (!confirm) return;

    const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
    const componentId = event.target.parentElement.parentElement.dataset["componentId"];

    data.projectClient.editAsset(SupClient.query.asset, "removeComponent", nodeId, componentId);
  });
}

export function setCameraMode(mode: string) {
  engine.gameInstance.destroyComponent(engine.cameraControls);
  ui.cameraMode = mode;

  (document.querySelector(".controls .camera-vertical-axis") as HTMLDivElement).hidden = ui.cameraMode !== "3D";
  (document.querySelector(".controls .camera-speed") as HTMLDivElement).hidden = ui.cameraMode !== "3D";
  (document.querySelector(".controls .camera-2d-z") as HTMLDivElement).hidden = ui.cameraMode === "3D";

  const axis = ui.cameraMode === "3D" ? ui.cameraVerticalAxis : "Y";
  engine.cameraRoot.setLocalEulerAngles(new THREE.Euler(axis === "Y" ? 0 : Math.PI / 2, 0, 0));
  updateCameraMode();
  engine.cameraControls.changeMode(sceneUserSettings.pub.controlSchemes);
  ui.cameraModeButton.textContent = ui.cameraMode;
}

function onChangeCameraMode(event: any) {
  setCameraMode(ui.cameraMode === "3D" ? "2D" : "3D");
}

export function setCameraVerticalAxis(axis: string) {
  ui.cameraVerticalAxis = axis;

  engine.cameraRoot.setLocalEulerAngles(new THREE.Euler(axis === "Y" ? 0 : Math.PI / 2, 0, 0));
  if (ui.cameraMode === "3D") engine.gridHelperComponent.actor.setLocalEulerAngles(new THREE.Euler(axis === "Z" ? Math.PI / 2 : 0, 0, 0));
  ui.cameraVerticalAxisButton.textContent = axis;
}

function onChangeCameraVerticalAxis(event: any) {
  setCameraVerticalAxis(ui.cameraVerticalAxis === "Y" ? "Z" : "Y");
}

function onChangeCameraSpeed() {
  engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
}

function onChangeCamera2DZ() {
  const z = parseFloat(ui.camera2DZ.value);
  if (isNaN(z)) return;

  engine.cameraActor.threeObject.position.setZ(z);
  engine.cameraActor.threeObject.updateMatrixWorld(false);
}

// Drag'n'drop
function onDragOver(event: DragEvent) {
  if (data == null || data.projectClient.entries == null) return;

  // NOTE: We can't use event.dataTransfer.getData() to do an early check here
  // because of browser security restrictions

  ui.actorDropElt.hidden = false;
  if (ui.nodesTreeView.selectedNodes.length === 1) {
    const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
    const node = data.sceneUpdater.sceneAsset.nodes.byId[nodeId];
    if (node.prefab == null) ui.componentDropElt.hidden = false;
  }

  // Ensure we're not hovering the nodes tree view or component area
  let ancestorElt = (event.target as HTMLElement).parentElement;
  let preventDefaultBehavior = true;
  while (ancestorElt != null) {
    if (ancestorElt === ui.componentsElt || ancestorElt === ui.treeViewElt || (ui.componentDropElt.hidden && ancestorElt === ui.prefabRow)) {
      preventDefaultBehavior = false;
      break;
    }
    ancestorElt = ancestorElt.parentElement;
  }
  if (preventDefaultBehavior) event.preventDefault();

  if (ui.dropTimeout != null) clearTimeout(ui.dropTimeout);
  ui.dropTimeout = setTimeout(() => { onStopDrag(); }, 300);
}

function onStopDrag() {
  if (ui.dropTimeout != null) {
    clearTimeout(ui.dropTimeout);
    ui.dropTimeout = null;
  }
  ui.actorDropElt.hidden = true;
  ui.actorDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false);
  ui.componentDropElt.hidden = true;
  ui.componentDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false);
}

function onActorDragEnter(event: DragEvent) { ui.actorDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", true); }
function onActorDragLeave(event: DragEvent) { ui.actorDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false); }
function onActorDrop(event: DragEvent) {
  if (data == null || data.projectClient.entries == null) return;

  // TODO: Support importing multiple assets at once
  const entryId = event.dataTransfer.getData("application/vnd.superpowers.entry").split(",")[0];
  if (typeof entryId !== "string") return;

  const entry = data.projectClient.entries.byId[entryId];
  const plugin = SupClient.getPlugins<SupClient.ImportIntoScenePlugin>("importIntoScene")[entry.type];
  if (plugin == null || plugin.content.importActor == null) {
    const reason = SupClient.i18n.t("sceneEditor:errors.cantImportAssetTypeIntoScene");
    new SupClient.Dialogs.InfoDialog(SupClient.i18n.t("sceneEditor:failures.importIntoScene", { reason }));
    return;
  }
  event.preventDefault();

  const raycaster = new THREE.Raycaster();
  const mousePosition = { x: (event.clientX / ui.canvasElt.clientWidth) * 2 - 1, y: -(event.clientY / ui.canvasElt.clientHeight) * 2 + 1 };
  raycaster.setFromCamera(mousePosition, engine.cameraComponent.threeCamera);

  const plane = new THREE.Plane();
  const offset = new THREE.Vector3(0, 0, -10).applyQuaternion(engine.cameraActor.getGlobalOrientation(new THREE.Quaternion()));
  const planePosition = engine.cameraActor.getGlobalPosition(new THREE.Vector3()).add(offset);
  plane.setFromNormalAndCoplanarPoint(offset.normalize(), planePosition);

  const position = raycaster.ray.intersectPlane(plane, new THREE.Vector3());

  const options = { transform: { position }, prefab: false };
  plugin.content.importActor(entry, data.projectClient, options, (err: string, nodeId: string) => {
    if (err != null) {
      new SupClient.Dialogs.InfoDialog(SupClient.i18n.t("sceneEditor:failures.importIntoScene", { reason: err }));
      return;
    }

    ui.nodesTreeView.clearSelection();
    const entryElt = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement;
    ui.nodesTreeView.addToSelection(entryElt);
    ui.nodesTreeView.scrollIntoView(entryElt);
    setupSelectedNode();

    ui.canvasElt.focus();
  });
}

function onComponentDragEnter(event: DragEvent) { ui.componentDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", true); }
function onComponentDragLeave(event: DragEvent) { ui.componentDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false); }
function onComponentDrop(event: DragEvent) {
  if (data == null || data.projectClient.entries == null) return;

  // TODO: Support importing multiple assets at once
  const entryId = event.dataTransfer.getData("application/vnd.superpowers.entry").split(",")[0];
  if (typeof entryId !== "string") return;

  const entry = data.projectClient.entries.byId[entryId];
  const plugin = SupClient.getPlugins<SupClient.ImportIntoScenePlugin>("importIntoScene")[entry.type];
  if (plugin == null || plugin.content.importComponent == null) {
    const reason = SupClient.i18n.t("sceneEditor:errors.cantImportAssetTypeIntoScene");
    new SupClient.Dialogs.InfoDialog(SupClient.i18n.t("sceneEditor:failures.importIntoScene", { reason }));
    return;
  }
  event.preventDefault();

  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  plugin.content.importComponent(entry, data.projectClient, nodeId, (err: string, nodeId: string) => { /* Ignore */ });
}
