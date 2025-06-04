export * from "./impl/AutoGenerateKeyMap";
export * from "./impl/CamerableE";
export * from "./impl/CanvasDrawer";
export * from "./impl/DIContainer";
export * from "./impl/EventTrigger";
export * from "./impl/IgnoreCameraE";
export * from "./impl/OperationPluginBase";

export * from "./sac/AkashicEngine";
export * from "./sac/Environment";
export * from "./sac/SacClient";
export * from "./sac/SacEvent";
export * from "./sac/SacServer";
export * from "./sac/ServerError";
export * from "./sac/ShareBigText";

export * from "./utils/DragDrop";
export * from "./utils/Image";
export * from "./utils/LocalStorage";
export * from "./utils/Util";


import { partialInitEnv } from "./sac/Environment";
import { SacClient } from "./sac/SacClient";
import { SacServer } from "./sac/SacServer";
import { ServerErrorFrom } from "./sac/ServerError";

export interface SacInitializeParam {
  gameMainParam: g.GameMainParameterObject;
  options?: SacInitializeOptions;

  /**
   * 初期化完了後にサーバーでのみ呼び出されます
   * @param server サーバー用インスタンス
   * @param initializedValue 初期化値
   * @returns 
   */
  serverStart?: (server: SacServer, initializedValue: SacInitializedValue) => void;

  /**
   * 初期化完了後にどの環境でも呼び出されます\
   * 実行タイミングは`serverStart`と`clientStart`の間です
   * @param initializedValue 初期化値
   * @returns 
   */
  initialized?: (initializedValue: SacInitializedValue) => void;

  /**
   * 初期化完了後にクライアントでのみ呼び出されます
   * @param client クライアント用インスタンス
   * @param initializedValue 初期化値
   */
  clientStart: (client: SacClient, initializedValue: SacInitializedValue) => void;
}

/**
 * SACの初期化時の指定
 */
export interface SacInitializeOptions {
  /** シーン生成用引数 */
  sceneParam?: Omit<g.SceneParameterObject, "game" | "tickGenerationMode" | "local">;
}

/**
 * SACの初期化が完了して呼び出される関数に渡される値
 */
export interface SacInitializedValue {
  gameMainParam: g.GameMainParameterObject;
}

/**
 * 環境の初期を行い、ゲームを実行します
 * @param param 初期化値
 * @param options オプション
 */
export function sacInitialize(param: SacInitializeParam): void {
  // 環境変数の一部分のみの初期化を実行. 完全に初期化する関数を受け取る
  const perfectInitEnv = partialInitEnv();
  // ========== 注意!!!!!!!!!!! ==========
  // この時点で`g.gam.env`は一部分のみしか初期化されていない

  // 最初にシーンが無いと Join が発生しないためシーンをゲームに追加する
  g.game.pushScene(new g.Scene({ game: g.game }));

  // スナップショットがある場合はそのスナップショット時点以前にJOINが発生してると決めつける
  if (param.gameMainParam.snapshot) {
    const hostId = param.gameMainParam.snapshot.hostId;
    if (typeof hostId !== "string") {
      throw new Error(`スナップショットの復元に失敗しました\nAkashic-Sac を利用する場合、スナップショットには必ず'hostId: g.game.env.hostId'を含めて下さい`);
    }

    run(hostId);
  }
  // サーバーかつプレイヤーが存在する環境
  else if (g.game.env.gameType === "solo") {
    run(g.game.selfId!);
  }
  else {
    g.game.onJoin.addOnce(e => run(e.player.id!));
  }


  function run(hostId: string) {
    const scene = new g.Scene({
      tickGenerationMode: "manual",
      local: "interpolate-local",
      game: g.game,
      ...param.options?.sceneParam,
    });

    // すでにあるシーンを上書きしたいため`replaceScene`で置き換える
    g.game.replaceScene(scene, false);

    scene.onLoad.addOnce(() => {
      perfectInitEnv({ hostId, scene });
      // この時点で`g.game.env`が完全に初期化されている

      const initializedValue: SacInitializedValue = {
        gameMainParam: param.gameMainParam,
      };

      try {
        param.initialized?.(initializedValue);
      } catch (e) {
        if (!g.game.env.hasServer) throw e;
        g.game.env.server.error(ServerErrorFrom.initialize, e);
      }

      if (g.game.env.hasServer) {
        try {
          param.serverStart?.(g.game.env.server, initializedValue);
        } catch (e) {
          g.game.env.server.error(ServerErrorFrom.start, e);
        }
      }

      if (g.game.env.hasClient) {
        param.clientStart?.(g.game.env.client, initializedValue);
      }
    });
  }
}
