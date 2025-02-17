# 説明

akashic-sac は [coeライブラリ](https://github.com/akashic-games/coe) を参考に作られたライブラリです\
マルチプレイゲームを作成することに特化しており、\
サーバー・クライアント間の通信を簡潔に行うことが出来ます

Akashic Engine のマルチプレイ時の動作に関する知識が多少になります\
私の書いた [記事](https://qiita.com/mujurin/items/9bb3a6d114d6b62bbe53) が参考になれば幸いです\
(読みづらいのは仕様です…いつか書き直します)

~~_このライブラリを使う場合、シーンは１つしか利用できません。_~~\
**この問題は解決されました**

…登録されたイベントはシーン遷移後どうなっているか調査中‥\
問題なさそう (たぶん)


## 最小の例
```typescript
import { createFont, SacClient,  sacInitialize, SacInitializedValue } from "akashic-sac";

export = (gameMainParam: g.GameMainParameterObject) => {
  // コメントアウトしている値はオプショナル値です
  sacInitialize({
    gameMainParam,
    // 下３つは初期化後呼び出される関数です
    // initialized,   // どの環境でも実行されます
    // serverStart,   // サーバーでのみ実行されます
    clientStart,      // クライアントでのみ実行されます
    // options: {
    //   sceneParam: { }  // 最初に生成されるシーンの引数
    // }
  });
};

function clientStart(client: SacClient, initializedValue: SacInitializedValue) {
  // 最初のシーンは自動生成されます
  const scene = g.game.env.scene;
  new g.Label({
    scene, parent: scene,
    font: createFont({ size: 20 }),
    text: `生主のID ${g.game.env.hostId}`,
  });
}
```

`sacInitialize` 関数は次の処理を行います
1. 生主のJOINが発生するまで待機
2. `options.sceneParam` を引数に最初のシーンを生成
3. SAC 用の環境変数である `g.game.env` を初期化
4. `initialized` `serverStart` `clientStart` の順で実行

readonly の `g.game.env.scene` は常に現在のシーンの参照です


## 通信の例
```typescript
class JoinPlayer extends SacEvent {
  constructor(
    readonly name: string,
    readonly realName: boolean,
  ) { super(); }
}

function serverStart(server: SacServer, initializedValue: SacInitializedValue) {
  // 2. クライアントから参加イベントを受信
  JoinPlayer.receive(server, data => {
    // 3. クライアントへ参加イベントを送信
    server.broadcast(data); // 受信したデータをそのまま配信
  });
}

function clientStart(client: SacClient, initializedValue: SacInitializedValue) {
  resolvePlayerInfo(null, (_, info) => {
    // 1. サーバーへ参加イベントを送信
    client.sendEvent(
      new JoinPlayer(info?.name ?? "NULL", info?.userData?.accepted ?? false)
    );
  });

  // 4. サーバーから参加イベントを受信
  JoinPlayer.receive(client, data => console.log("new player", data));
}
```

| 実行環境     | 送信に使用する関数           | 受信に使用する関数                   |
| ------------ | ---------------------------- | ------------------------------------ |
| サーバー     | `server.broadcast(SacEvent)` | `SacEvent.receive(server, Function)` |
| クライアント | `client.sendEvent(SacEvent)` | `SacEvent.receive(client, Function)` |

`SacEvent` は以下のプロパティを持っています
* `eventName` クラス名
* `playerId` イベントの送信者ID
  * `server.broadcast` で送信する場合は以下の優先度で決定される
  * 第2引数の値 > 第1引数で渡したイベントの `playerId` の値

データの送受信には以下のルールがあります (これは Akashic Engine の制約です)
* クライアントからの送信はサーバーで受信される
* サーバーからの送信は全てのクライアントで受信される


## 実践的な例
```typescript
class PlayGame extends SacEvent { }
class ScoreUp extends SacEvent { readonly point = 1; }
class EndGame extends SacEvent { }

interface Snapshot { endGame: EndGame; }

function serverStart(server: SacServer) {
  const hostId = g.game.env.hostId;

  PlayGame.receive(server, data => {
    if (data.playerId !== hostId) return;

    server.broadcast(data);
    g.game.env.scene.setTimeout(() => {
      const endGame = new EndGame();
      server.requestSaveSnapshot<Snapshot>(() => ({
        snapshot: { hostId, endGame }
      }));
      server.broadcast(endGame, hostId);
    }, 5000);
  });
  ScoreUp.receive(server, server.broadcast_bind);
}

function clientStart(client: SacClient, initializedValue: SacInitializedValue) {
  const snapshot = initializedValue.gameMainParam.snapshot;
  if (hasSnapshot(snapshot)) {
    gameFinish(snapshot.endGame);
    return;
  }

  const eventKeys: number[] = [
    PlayGame.receive(client, () => {
      client.removeEventSets(eventKeys);
      gameStart();
    }),
  ];

  g.game.env.scene.onPointDownCapture.addOnce(() => {
    client.sendEvent(new PlayGame());
  });
}

function gameStart() {
  console.log("ゲーム開始");
  const client = g.game.clientEnv.client;
  const playerManager = client.env.clientDI.reflesh(PlayerManager);

  const eventKeys: number[] = [
    ScoreUp.receive(client, playerManager.scoreUp),
    EndGame.receive(client, data => {
      client.removeEventSets(eventKeys);
      gameFinish(data);
    })
  ];

  g.game.env.scene.onPointDownCapture.addOnce(() => {
    client.sendEvent(new ScoreUp());
  });
}

function gameFinish(endGame: EndGame) {
  const client = g.game.clientEnv.client;
  console.log("優勝者は ", endGame.playerId);

  const eventKeys: number[] = [
    PlayGame.receive(client, () => {
      client.removeEventSets(eventKeys);
      gameStart();
    }),
  ];

  g.game.env.scene.onPointDownCapture.addOnce(() => {
    client.sendEvent(new PlayGame());
  });
}

function hasSnapshot(snapshot: unknown): snapshot is SacSnapshotSaveData<Snapshot> {
  if (snapshot) return true;
  return false;
}

class PlayerManager {
  public scoreUp(scoreUp: ScoreUp): void {
    console.log(`${scoreUp.playerId}: ${scoreUp.point}点獲得`);
  }
}
```




// vscode Markdown preview 用 CSS
<style>
body.vscode-body {
  &,
  > body {
    padding-left: 0;
    padding-right: 0;
  }

  ul {
    padding-left: 1.5em;
  }

  code {
    font-size: 0.9em;
    white-space: pre;
  }

  pre code {
    * {
      font-style: unset !important;
    }
  }
}
</style>
