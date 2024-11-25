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

export interface SacInitializedStartParam {
  gameMainParam: g.GameMainParameterObject;
  options?: SacInitializedStartOptions;

  /**
   * サーバー実行用
   */
  serverStart?: (server: Server) => void;

  /**
   * 全ての初期化が完了したら呼ばれる\
   * サーバー/クライアントどちらでも呼ばれる\
   * 実行タイミングは `serverStart` と `clientStart` の間
   */
  initialized?: () => void;

  /**
   * クライアント実行用
   */
  clientStart?: (client: Client) => void;
}

export interface SacInitializedStartOptions {
  /** シーン生成用引数 */
  sceneParam?: Omit<g.SceneParameterObject, "game" | "tickGenerationMode" | "local">;
}

/**
 * 環境の初期を行い、ゲームを実行します
 * @param param 初期化値
 * @param options オプション
 */
export const sacInitializedStart = (param: SacInitializedStartParam): void => {
  // 環境変数の一部分のみの初期化を実行. 完全に初期化する関数を受け取る
  const perfectInitEnv = partialInitEnvironment(param.options);

  const run = (hostId: string) => {
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

      if (env.hasServer) {
        param.serverStart?.(env.server);
      }

      param.initialized?.();

      if (env.hasClient) {
        param.clientStart?.(env.client);
      }
    });
  };

  // ＊＊＊注意＊＊＊
  // この時点で`g.gam.env`は一部分のみしか初期化されていない

  // onJoin を発生させるための空のシーン
  const scene = new g.Scene({ game: g.game });

  // スナップショットがある場合はそのスナップショット時点以前にJOINが発生してると決めつける
  if (param.gameMainParam.snapshot) {
    const hostId = param.gameMainParam.snapshot.hostId;
    if (typeof hostId !== "string") {
      throw new Error(`スナップショットの復元に失敗しました\nAkashic-Sac を利用する場合、スナップショットには必ず'hostId: g.game.env.hostId'を含めて下さい`);
    }

    g.game.pushScene(scene);
    run(hostId);
  }
  // サーバーかつプレイヤーが存在する環境
  else if (g.game.env.gameType === "solo") {
    g.game.pushScene(scene);
    run(g.game.selfId!);
  }
  else {
    g.game.onJoin.addOnce(e => run(e.player.id!));
    // 最初にシーンが無いと Join が発生しないため、空のシーンをゲームに追加する
    g.game.pushScene(scene);
  }
};
