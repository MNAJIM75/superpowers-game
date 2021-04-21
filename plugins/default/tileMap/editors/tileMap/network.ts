import ui, { setupLayer, setupSmartGroup, selectBrushTool, refreshLayersId, refreshSmartGroupsId, onLayerSelect, onSmartGroupSelect } from "./ui";
import mapArea from "./mapArea";
import tileSetArea from "./tileSetArea";

import { TileMapLayerPub, SmartGroupPub } from "../../data/TileMapLayers";
import TileMapRenderer from "../../components/TileMapRenderer";
import TileMapRendererUpdater from "../../components/TileMapRendererUpdater";

import TileSet from "../../components/TileSet";
import TileSetRenderer from "../../components/TileSetRenderer";
import TileSetRendererUpdater from "../../components/TileSetRendererUpdater";

export const data: { projectClient?: SupClient.ProjectClient; tileMapUpdater?: TileMapRendererUpdater, tileSetUpdater?: TileSetRendererUpdater } = {};

let socket: SocketIOClient.Socket;
SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "tileMapEditor" }], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
});

const onEditCommands: { [command: string]: Function; } = {};
const onTileSetEditCommands: { [command: string]: Function; } = {};

function onConnected() {
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: true });

  const tileMapActor = new SupEngine.Actor(mapArea.gameInstance, "Tilemap");
  const tileMapRenderer = new TileMapRenderer(tileMapActor);
  const config = { tileMapAssetId: SupClient.query.asset, tileSetAssetId: null as string, materialType: "basic" };

  const subscribers: { [name: string]: SupClient.AssetSubscriber } = {
    tileMap: {
      onAssetReceived: onTileMapAssetReceived,
      onAssetEdited: (assetId, command, ...args) => { if (onEditCommands[command] != null) onEditCommands[command](...args); },
      onAssetTrashed: SupClient.onAssetTrashed
    }
  };

  data.tileMapUpdater = new TileMapRendererUpdater(data.projectClient, tileMapRenderer, config, subscribers);
}

const setProperty = onEditCommands["setProperty"] = (path: string, value: any) => {
  ui.settings[path].value = value;

  if (path === "pixelsPerUnit" && data.tileMapUpdater.tileSetAsset != null) {
    const tileSetPub = data.tileMapUpdater.tileSetAsset.pub;
    const tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
    mapArea.cameraControls.setMultiplier(value / tileSetPub.grid.width / 1);

    mapArea.gridRenderer.setRatio({ x: tileMapPub.pixelsPerUnit / tileSetPub.grid.width, y: tileMapPub.pixelsPerUnit / tileSetPub.grid.height });
    mapArea.patternRenderer.refreshPixelsPerUnit(tileMapPub.pixelsPerUnit);
    mapArea.patternBackgroundRenderer.refreshScale(1 / tileMapPub.pixelsPerUnit);
  }
};

// Tilemap
function onTileMapAssetReceived() {
  const pub = data.tileMapUpdater.tileMapAsset.pub;

  const tileSetActor = new SupEngine.Actor(tileSetArea.gameInstance, "Tileset");
  const tileSetRenderer = new TileSetRenderer(tileSetActor);
  const config = { tileSetAssetId: pub.tileSetId };

  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived: onTileSetAssetReceived,
    onAssetEdited: (assetId, command, ...args) => { if (onTileSetEditCommands[command] != null) onTileSetEditCommands[command](...args); }
  };
  data.tileSetUpdater = new TileSetRendererUpdater(data.projectClient, tileSetRenderer, config, subscriber);

  updateTileSetInput();
  onEditCommands["resizeMap"]();

  for (const setting in ui.settings) setProperty(setting, (pub as any)[setting]);
  for (let index = pub.layers.length - 1; index >= 0; index--) setupLayer(pub.layers[index], index);

  tileSetArea.selectedLayerId = pub.layers[0].id.toString();
  ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${pub.layers[0].id}"]`) as HTMLLIElement);
  onLayerSelect();
  mapArea.patternActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, pub.layerDepthOffset / 2));

  const maxDim = Math.max(pub.width, pub.height);
  mapArea.cameraComponent.setOrthographicScale(maxDim / 10.0 + 0.2);
  mapArea.cameraComponent.actor.setLocalPosition(new SupEngine.THREE.Vector3(pub.width / 20.0, pub.height / 20.0, 100)); // Divided by 10 then by 2
}

function updateTileSetInput() {
  const assetId = data.tileMapUpdater.tileMapAsset.pub.tileSetId;
  const tileSetName = (assetId != null) ? data.projectClient.entries.getPathFromId(assetId) : "";
  ui.tileSetInput.value = tileSetName;
  ui.selectTileSetButton.textContent = SupClient.i18n.t(`common:actions.${assetId == null ? "select" : "clear"}`);
}

onEditCommands["changeTileSet"] = () => {
  updateTileSetInput();
  data.tileSetUpdater.changeTileSetId(data.tileMapUpdater.tileMapAsset.pub.tileSetId);
};

onEditCommands["resizeMap"] = () => {
  const width = data.tileMapUpdater.tileMapAsset.pub.width;
  const height = data.tileMapUpdater.tileMapAsset.pub.height;
  ui.sizeInput.value = `${width} × ${height}`;
  mapArea.gridRenderer.resize(width, height);
};

onEditCommands["newLayer"] = (layerPub: TileMapLayerPub, index: number) => {
  setupLayer(layerPub, index);

  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
  const z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset;
  mapArea.patternActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, z));

  refreshLayersId();
};

onEditCommands["renameLayer"] = (id: string, newName: string) => {
  const layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  layerElt.querySelector(".name").textContent = newName;
};

onEditCommands["deleteLayer"] = (id: string) => {
  const layerElt = ui.layersTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;
  ui.layersTreeView.remove(layerElt);

  if (id === tileSetArea.selectedLayerId) {
    tileSetArea.selectedLayerId = data.tileMapUpdater.tileMapAsset.pub.layers[0].id;
    ui.layersTreeView.clearSelection();
    ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${tileSetArea.selectedLayerId}"]`) as HTMLLIElement);
    onLayerSelect();
  }

  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
  const z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset;
  mapArea.patternActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, z));

  refreshLayersId();
};

onEditCommands["moveLayer"] = (id: string, newIndex: number) => {
  const pub = data.tileMapUpdater.tileMapAsset.pub;

  const layerElt = ui.layersTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;
  ui.layersTreeView.insertAt(layerElt, "item", pub.layers.length - newIndex);

  const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
  const z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset;
  mapArea.patternActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, z));

  refreshLayersId();
};

onEditCommands["newSmartGroup"] = (layerId: string, smartGroup: SmartGroupPub, index: number) => {
  if (tileSetArea.selectedLayerId === layerId) {
    setupSmartGroup(smartGroup, index);
    refreshSmartGroupsId();
  }
};

onEditCommands["renameSmartGroup"] = (layerId: string, smartGroupId: string, newName: string) => {
  if (tileSetArea.selectedLayerId === layerId) {
    const smartElt = ui.smartGroupTreeView.treeRoot.querySelector(`[data-id="${smartGroupId}"]`);
    smartElt.querySelector(".name").textContent = newName;
  }
};

onEditCommands["deleteSmartGroup"] = (layerId: string, smartGroupId: string) => {
  if (tileSetArea.selectedLayerId === layerId) {
    const smartElt = ui.smartGroupTreeView.treeRoot.querySelector(`[data-id="${smartGroupId}"]`) as HTMLLIElement;
    ui.smartGroupTreeView.remove(smartElt);

    if (smartGroupId === tileSetArea.selectedSmartGroup) {
      ui.smartGroupTreeView.clearSelection();
      onSmartGroupSelect();
    }

    refreshSmartGroupsId();
  }
};

onEditCommands["moveSmartGroup"] = (layerId: string, smartGroupId: string, newIndex: number) => {
  if (tileSetArea.selectedLayerId === layerId) {
    const pub = data.tileMapUpdater.tileMapAsset.layers.byId[layerId];
    const smartElt = ui.smartGroupTreeView.treeRoot.querySelector(`li[data-id="${smartGroupId}"]`) as HTMLLIElement;
    ui.smartGroupTreeView.insertAt(smartElt, "item", pub.smartGroups.length - newIndex);
    refreshSmartGroupsId();
  }
};

// Tileset
function onTileSetAssetReceived() {
  const tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
  const tileSetPub = data.tileMapUpdater.tileSetAsset.pub;

  mapArea.cameraControls.setMultiplier(tileMapPub.pixelsPerUnit / tileSetPub.grid.width / 1);
  mapArea.gridRenderer.setRatio({ x: tileMapPub.pixelsPerUnit / tileSetPub.grid.width, y: tileMapPub.pixelsPerUnit / tileSetPub.grid.height });

  if (tileSetPub.texture != null) {
    mapArea.patternRenderer.setTileSet(new TileSet(tileSetPub));
    if (ui.brushToolButton.checked) selectBrushTool(0, 0);
  }
  mapArea.patternBackgroundRenderer.setup(0x900090, 1 / tileMapPub.pixelsPerUnit, tileSetPub.grid.width);
}

onTileSetEditCommands["upload"] = () => {
  mapArea.patternRenderer.setTileSet(new TileSet(data.tileMapUpdater.tileSetAsset.pub));
  if (ui.brushToolButton.checked) selectBrushTool(0, 0);
};

onTileSetEditCommands["setProperty"] = () => {
  const tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
  const tileSetPub = data.tileMapUpdater.tileSetAsset.pub;

  mapArea.cameraControls.setMultiplier(tileMapPub.pixelsPerUnit / tileSetPub.grid.width / 1);
  mapArea.gridRenderer.setRatio({ x: tileMapPub.pixelsPerUnit / tileSetPub.grid.width, y: tileMapPub.pixelsPerUnit / tileSetPub.grid.height });
  if (tileSetPub.texture != null) mapArea.patternRenderer.setTileSet(new TileSet(tileSetPub));
  mapArea.patternBackgroundRenderer.setup(0x900090, 1 / tileMapPub.pixelsPerUnit, tileSetPub.grid.width);

  if (ui.brushToolButton.checked) selectBrushTool(0, 0);
};
