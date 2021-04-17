export interface SmartGroupPub {
  id: string;
  name: string;
  color: string;
}

export interface TileRulesPub {
  id: string;
  tile: number;
  pattern: string[];
  size: number;
  chance: number;
  active: boolean;
}

export interface TileMapLayerPub {
  id: string;
  name: string;
  data: ((number|boolean)[]|number)[];
  isSmartLayer: boolean;
  smartGroups: SmartGroupPub[];
  smartData: string[];
  rules: TileRulesPub[];
}

export default class TileMapLayers extends SupCore.Data.Base.ListById {
  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    data: { type: "array" },
    isSmartLayer: { type: "boolean", mutable: true },
    smartGroups: { type: "array" },
    smartData: { type: "array" },
    rules: { type: "array" }
  };

  pub: TileMapLayerPub[];
  byId: { [id: string]: TileMapLayerPub };

  constructor(pub: TileMapLayerPub[]) {
    super(pub, TileMapLayers.schema);
  }
}
