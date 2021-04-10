import ui, { selectBrushTool, selectFillTool } from "./ui";
import { setupPattern } from "./mapArea";
import { data } from "./network";

const tmpVector3 = new SupEngine.THREE.Vector3();

const tileSetArea: {
  gameInstance?: SupEngine.GameInstance;

  cameraComponent?: any;

  selectedLayerId?: string;
  selectedSmartGroup?: string;

  selectionStartPoint?: { x: number; y : number };
  selectionEndPoint?: { x: number; y : number };

  tileSetElt?: HTMLCanvasElement;
  rulesElt?: HTMLElement;
} = {};

tileSetArea.tileSetElt = <HTMLCanvasElement>document.querySelector("canvas.tileSet");
tileSetArea.rulesElt = <HTMLElement>document.querySelector("div.rules");
tileSetArea.gameInstance = new SupEngine.GameInstance(tileSetArea.tileSetElt);

const cameraActor = new SupEngine.Actor(tileSetArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
tileSetArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
tileSetArea.cameraComponent.setOrthographicMode(true);
tileSetArea.cameraComponent.setClearColor(0xbbbbbb);
new SupEngine.editorComponentClasses["Camera2DControls"](
  cameraActor, tileSetArea.cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 0.1, zoomMax: 10000 },
  () => { data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(tileSetArea.cameraComponent.orthographicScale); }
);
export default tileSetArea;

function getTileSetGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  const mousePosition = gameInstance.input.mousePosition;
  const position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  cameraComponent.actor.getLocalPosition(tmpVector3);
  const ratio = data.tileMapUpdater.tileSetAsset.pub.grid.width / data.tileMapUpdater.tileSetAsset.pub.grid.height;

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += tmpVector3.x;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= tmpVector3.y;
  y *= ratio;
  y = Math.floor(y);

  return [ x, y ];
}

export function handleTileSetArea() {
  if (data.tileMapUpdater == null) return;
  if (data.tileMapUpdater.tileMapAsset == null) return;
  if (data.tileMapUpdater.tileSetAsset == null) return;
  if (data.tileMapUpdater.tileSetAsset.pub.texture == null) return;

  const tilesPerRow = data.tileMapUpdater.tileSetAsset.pub.texture.image.width / data.tileMapUpdater.tileSetAsset.pub.grid.width;
  const tilesPerColumn = data.tileMapUpdater.tileSetAsset.pub.texture.image.height / data.tileMapUpdater.tileSetAsset.pub.grid.height;

  const [ mouseX, mouseY ] = getTileSetGridPosition(tileSetArea.gameInstance, tileSetArea.cameraComponent);
  if (tileSetArea.gameInstance.input.mouseButtons[0].wasJustPressed) {
    if (mouseX >= 0 && mouseX < tilesPerRow && mouseY >= 0 && mouseY < tilesPerColumn) {
      if (ui.fillToolButton.checked) {
        selectFillTool(mouseX, mouseY);
      } else {
        tileSetArea.selectionStartPoint = { x: mouseX, y: mouseY };
        selectBrushTool(mouseX, mouseY);
      }
    }
  } else if (tileSetArea.selectionStartPoint != null) {
    // Clamp mouse values
    let x = Math.max(0, Math.min(tilesPerRow - 1, mouseX));
    let y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY));
    const startX = Math.min(tileSetArea.selectionStartPoint.x, x);
    const startY = Math.min(tileSetArea.selectionStartPoint.y, y);
    const width = Math.abs(x - tileSetArea.selectionStartPoint.x) + 1;
    const height = Math.abs(y - tileSetArea.selectionStartPoint.y) + 1;
    if (tileSetArea.gameInstance.input.mouseButtons[0].wasJustReleased) {
      const layerData: (number|boolean)[][] = [];
      for (let y = height - 1; y >= 0; y--)
        for (let x = 0; x < width; x++)
          layerData.push([ startX + x, startY + y, false, false, 0 ]);

      setupPattern(layerData, width);
      selectBrushTool(startX, startY, width, height);
      tileSetArea.selectionStartPoint = null;
    } else {
      data.tileSetUpdater.tileSetRenderer.select(startX, startY, width, height);
    }
  }
}
