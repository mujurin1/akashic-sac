export * from "./impl/AutoGenerateKeyMap";
export * from "./impl/CamerableE";
export * from "./impl/CanvasDrawer";
export * from "./impl/DIContainer";
export * from "./impl/IgnoreCameraE";
export * from "./impl/Trigger";

export * from "./sac/Client";
export * from "./sac/Environment";
export * from "./sac/game";
export * from "./sac/SacEvent";
export * from "./sac/Server";
export * from "./sac/ServerError";
export * from "./sac/ShareBigText";

export * from "./utils/AkashicEnigne";
export * from "./utils/DragDrop";
export * from "./utils/Image";
export * from "./utils/LocalStorage";


import { Client } from "./sac/Client";
import { partialInitEnvironment } from "./sac/Environment";
import { Server } from "./sac/Server";

export interface SacInitializeParam {
  gameMainParam: g.GameMainParameterObject;
  options?: SacInitializeOptions;

  /**
   * サーバー実行用
   */
  serverStart?: (server: Server, initializedValue: SacInitializedValue) => void;

  /**
   * 全ての初期化が完了したら呼ばれる\
   * サーバー/クライアントどちらでも呼ばれる\
   * 実行タイミングは `serverStart` が呼ばれてから `clientStart` が呼ばれる前
   */
  initialized?: (initializedValue: SacInitializedValue) => void;

  /**
   * クライアント実行用
   */
  clientStart?: (client: Client, initializedValue: SacInitializedValue) => void;
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
  const perfectInitEnv = partialInitEnvironment(param.options);
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
      // この関数呼び出しで`g.game.env`が完全に初期化される
      perfectInitEnv({ hostId, scene });
      const env = g.game.env;
      const initializedValue: SacInitializedValue = {
        gameMainParam: param.gameMainParam,
      };

      if (env.hasServer) {
        param.serverStart?.(env.server, initializedValue);
      }

      param.initialized?.(initializedValue);

      if (env.hasClient) {
        param.clientStart?.(env.client, initializedValue);
      }
    });
  }
}
