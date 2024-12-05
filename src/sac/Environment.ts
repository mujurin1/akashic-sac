import { SacInitializeOptions } from "..";
import { DIContainer } from "../impl/DIContainer";
import { Client } from "./Client";
import { Server } from "./Server";

/**
 * サーバー環境状態
 */
export interface EnvironmentServerState {
  /**
   * `Server`インスタンス\
   * `isServer:true`の環境に存在します
   */
  readonly server: Server;

  readonly serverDI: DIContainer;
}

/**
 * クライアント環境情報
 */
export interface EnvironmentClientState {
  /**
   * `Client`インスタンス
   */
  readonly client: Client;
  /**
   * ゲームが描画されるキャンバス
   */
  readonly canvas: HTMLCanvasElement;
  /**
   * ゲームが描画されるキャンバスのコンテキスト
   */
  readonly context: CanvasRenderingContext2D;

  readonly clientDI: DIContainer;

}

/**
 * 全環境情報
 */
export interface EnvironmentDefault {
  /** ゲームの主催者 (ニコ生なら生主) のID */
  readonly hostId: string;
  readonly scene: g.Scene;
  /** この端末のプレイヤーがゲームの起動者 (生主) かどうか */
  readonly isHost: boolean;
  /**
   * ゲームのタイプ\
   * `multi` : マルチ\
   * `solo`  : ランキング
   */
  readonly gameType: "multi" | "solo";

  /**
   * エンティティを作成する
   * @param entity 作成するエンティティクラス
   * @param param 作成するエンティティの生成オブジェクト(`scene`は指定不可)
   * @returns 作成したエンティティ
   */
  createEntity<e extends g.E, p extends g.EParameterObject>(
    entity: new (x: p) => e,
    param: Omit<p, "scene">
  ): e;
}

/**
 * クライアント環境
 */
export type EnvironmentServer = EnvironmentDefault & ({ hasClient: false; hasServer: true; } & EnvironmentServerState);
/**
 * クライアント環境
 */
export type EnvironmentClient = EnvironmentDefault & ({ hasClient: true; hasServer: false; } & EnvironmentClientState);
/**
 * サーバー&クライアント環境
 */
export type EnvironmentAll = EnvironmentDefault & ({ hasClient: true; hasServer: true; } & EnvironmentServerState & EnvironmentClientState);

/**
 * 環境情報
 */
export type Environment = EnvironmentServer | EnvironmentClient | EnvironmentAll;

export interface EnvironmentParam {
  /**
   * ゲーム主催者 (ニコ生上なら生主) のID\
   * アツマールソロならプレイヤーのIDが入る
   */
  hostId: string;
  scene: g.Scene;
}

/**
 * 環境変数を部分的に初期化します\
 * 完全に初期化するには戻り値の関数を実行します
 * @param options
 * @returns 環境変数を完全に初期化する関数
 */
export function partialInitEnvironment(options?: SacInitializeOptions): ((param: EnvironmentParam) => void) {
  let hasServer = false;
  let hasClient = false;
  let gameType: Environment["gameType"];
  const context: CanvasRenderingContext2D = (<any>g.game.renderers[0]).canvasRenderingContext2D;

  if (context == null) {
    hasServer = true;
    gameType = "multi";
  } else {
    // https://stackoverflow.com/questions/15631991/how-to-register-onkeydown-event-for-html5-canvas
    context.canvas.tabIndex = 0;
    context.canvas.style.outline = "none";
    hasClient = true;

    // g.game.isActiveInstance() サーバーかどうか
    if (g.game.isActiveInstance()) {
      hasServer = true;
      gameType = "solo";
    } else {
      hasServer = false;
      gameType = "multi";
    }
  }

  const defaultEnv: EnvironmentDefault = {
    hostId: null!,
    scene: null!,
    isHost: null!,
    gameType,
    createEntity: <e extends g.E, p extends g.EParameterObject>(
      entity: new (x: p) => e,
      param: Omit<p, "scene">
    ) => new entity({ scene: g.game.env.scene, ...param } as p),
  };

  if (hasServer && hasClient) {
    g.game.env = {
      ...defaultEnv,
      hasServer: hasServer,
      server: null!,
      serverDI: new DIContainer(),
      hasClient: hasClient,
      client: null!,
      canvas: document.getElementsByTagName("canvas")[0],
      context,
      clientDI: new DIContainer(),
    };
  } else if (hasServer) {
    g.game.env = {
      ...defaultEnv,
      hasServer: hasServer,
      server: null!,
      serverDI: new DIContainer(),
      hasClient: false,
    };
  } else if (hasClient) {
    g.game.env = {
      ...defaultEnv,
      hasServer: hasServer,
      hasClient: hasClient,
      client: null!,
      canvas: document.getElementsByTagName("canvas")[0],
      context,
      clientDI: new DIContainer(),
    };
  }

  Object.defineProperty(g.game, "clientEnv", {
    get: () => g.game.env
  });
  Object.defineProperty(g.game, "serverEnv", {
    get: () => g.game.env
  });

  return param => {
    g.game.env = {
      ...g.game.env,
      hostId: param.hostId,
      scene: param.scene,
      isHost: param.hostId === g.game.selfId
    };

    if (g.game.env.hasServer) {
      g.game.env = { ...g.game.env, server: new Server() };
    }

    if (g.game.env.hasClient) {
      g.game.env = { ...g.game.env, client: new Client() };
    }
  };
}
