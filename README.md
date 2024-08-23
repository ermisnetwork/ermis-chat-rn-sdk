# [ErmisChat](https://ermis.network) Chat SDK for JavaScript

![Platform](https://img.shields.io/badge/platform-JAVASCRIPT-orange.svg)
![Languages](https://img.shields.io/badge/language-TYPESCRIPT-orange.svg)
[![npm](https://img.shields.io/npm/v/ermis-js-sdk.svg?style=popout&colorB=red)](https://www.npmjs.com/package/ermis-js-sdk)

## Table of contents

1.  [Introduction](#introduction)
1.  [Requirements](#requirements)
1.  [Getting started](#getting-started)
1.  [Sending your first message](#sending-your-first-message)
1.  [Additional information](#additional-information)

## Introduction

The ErmisChat SDK for JavaScript allows you to add real-time chat into your client app with minimal effort.

## Requirements

This section shows you the prerequisites you need to check for using ErmisChat SDK for JavaScript. If you have any comments or questions regarding bugs and feature requests.

### Supported browsers

|      Browser      | Supported versions     |
| :---------------: | :--------------------- |
| Internet Explorer | Not supported          |
|       Edge        | 13 or higher           |
|      Chrome       | 16 or higher           |
|      Firefox      | 11 or higher           |
|      Safari       | 7 or higher            |
|       Opera       | 12.1 or higher         |
|    iOS Safari     | 7 or higher            |
|  Android Browser  | 4.4 (Kitkat) or higher |

<br />

## Getting started

The ErmisChat client is setup to allow extension of the base types through use of generics when instantiated. The default instantiation has all generics set to `Record<string, unknown>`.
<br />

## Step by step

### Step 1: Create a API key application from your dashboard

Before installing ErmisChat SDK, you need to create a API key application on the [Ermis Dashboard](https://ermis.network). You will need the `Api key` of your Ermis application when initializing the Chat SDK.

> **Note**: Ermis Dashboard coming soon

<br />

### Step 2: Install the Chat SDK

You can install the Chat SDK with either `npm` or `yarn`.

**npm**

```bash
$ npm install ermis-js-sdk
```

> Note: To use npm to install the Chat SDK, Node.js must be first installed on your system.

**yarn**

```bash
$ yarn add ermis-js-sdk
```

### Step 3: Install the WalletConnect

You need to install WalletConnect to sign and login to Chat SDK. [WalletConnect docs](https://docs.walletconnect.com/appkit/javascript/core/installation), [Wagmi docs](https://wagmi.sh)

### Step 4: Login to ErmisChat

After install WalletConnect, you need import the ErmisAuth to Initialize.

```javascript
import { ErmisAuth } from 'ermis-js-sdk';
const authInstance = new ErmisAuth();
```

#### 4.1: Create challenge

Create challenge message before sign wallet.

```javascript
const challenge = await authInstance.createChallenge(address);
```

#### 4.2: Sign wallet and get token

After receiving the challenge message, you need to sign the wallet to get the signature use [useSignTypedData](https://wagmi.sh/react/api/hooks/useSignTypedData), then get token.

```javascript
const response = await authInstance.getToken(api_key, address, signature);
```

### Step 5: Import the Chat SDk

Client-side you initialize the Chat client with your API key

```javascript
import { ErmisChat } from 'ermis-js-sdk';
const chatClient = ErmisChat.getInstance(API_KEY);
```

Once initialized, you must specify the current user with connectUser:

```javascript
await client.connectUser(
  {
    api_key: API_KEY,
    id: user_id, // your address
    name: user_id,
  },
  `Bearer ${token}`,
);
```

<br />

## Sending your first message

Now that the Chat SDK has been imported, we're ready to start sending a message.

### Authentication

In order to use the features of the Chat SDK, you should initiate the `SendbirdChatSDK` instance through user authentication with Sendbird server. This instance communicates and interacts with the server based on an authenticated user account, and then the user’s client app can use the Chat SDK's features.

Here are the steps to sending your first message using Chat SDK:

### Step 4: Initialize the Chat SDK

Before authentication, you need to intialize the SDK by calling `SendbirdChat.init`.

The `init` method requires an appId, which is available from your Sendbird dashboard.

To improve performance, this SDK is modular. You must import and provide the required modules when calling `init`.

```javascript
import SendbirdChat from '@sendbird/chat';
import { OpenChannelModule } from '@sendbird/chat/openChannel';

const sb = SendbirdChat.init({
  appId: APP_ID,
  modules: [new OpenChannelModule()],
});
```

### Step 5: Connect to Sendbird server

Once the SDK is initialized, your client app can then connect to the Sendbird server. If you attempt to call a Sendbird SDK method without connecting, an `ERR_CONNECTION_REQUIRED (800101)` error would return.

Connect a user to Sendbird server either through a unique user ID or in combination with an access or session token. Sendbird prefers the latter method, as it ensures privacy with the user. The former is useful during the developmental phase or if your service doesn't require additional security.

#### A. Using a unique user ID

Connect a user to Sendbird server using their unique user ID. By default, Sendbird server can authenticate a user by a unique user ID. Upon request for a connection, the server queries the database to check for a match. Any untaken user ID is automatically registered as a new user to the Sendbird system, while an existing ID is allowed to log indirectly. The ID must be unique within a Sendbird application, such as a hashed email address or phone number in your service.

This allows you to get up and running without having to go deep into the details of the token registration process, however make sure to enable enforcing tokens before launching as it is a security risk to launch without.

```javascript
// The USER_ID below should be unique to your Sendbird application.
try {
  const user = await sb.connect(USER_ID);
  // The user is connected to Sendbird server.
} catch (err) {
  // Handle error.
}
```

#### B. Using a combination of unique user ID and token

Sendbird prefers that users connect using an access or session token, as it ensures privacy and security for the users.
When [Creating a user](https://sendbird.com/docs/chat/v3/platform-api/guides/user#2-create-a-user) you can choose to generate a users access token or session token.
A comparison between an access tokens and session tokens can be found [here](https://sendbird.com/docs/chat/v3/platform-api/user/managing-session-tokens/issue-a-session-token).
Once a token is issued, a user is required to provide the issued token in the `sb.connect()` method which is used for logging in.

1. Using the Chat Platform API, create a Sendbird user with the information submitted when a user signs up your service.
2. Save the user ID along with the issued access token to your persistent storage which is securely managed.
3. When the user attempts to log in to the Sendbird application, load the user ID and access token from the storage, and then pass them to the `sb.connect()` method.
4. Periodically replacing the user's access token is recommended to protect the account.

```javascript
try {
  const user = await sb.connect(USER_ID, ACCESS_TOKEN);
  // The user is connected to Sendbird server.
} catch (err) {
  // Handle error.
}
```

### Step 6: Create a new open channel

Create an open channel in the following way. [Open channels](https://sendbird.com/docs/chat/v4/ios/guides/open-channel) are where all users in your Sendbird application can easily participate without an invitation.

```javascript
try {
  const params = new OpenChannelParams();
  const channel = await sb.openChannel.createChannel(params);

  // An open channel is successfully created.
  // Channel data is return from a successful call to createChannel
  ...
} catch (err) {
  // Handle error.
}
```

### Step 7: Enter the channel

Enter the channel to send and receive messages.

```javascript
await channel.enter();
// The current user successfully enters the open channel
// and can chat with other users in the channel.
...
```

### Step 8: Send a message to the channel

Finally, send a message to the channel. There are [three types](https://sendbird.com/docs/chat/v4/platform-api/guides/messages#-3-resource-representation): a user message, which is a plain text, a file message, which is a binary file, such as an image or PDF, and an admin message, which is a plain text sent through the [dashboard](https://dashboard.sendbird.com/auth/signin) or [Chat Platform API](https://sendbird.com/docs/chat/v4/platform-api/guides/messages#2-send-a-message).

```javascript
const params = new UserMessageParams();
params.message = TEXT_MESSAGE;

channel.sendUserMessage(params)
  .onFailed((err: Error, message: UserMessage) => {
    // Handle error.
  })
  .onSucceeded((message: UserMessage) => {
    // The message is successfully sent to the channel.
    // The current user can receive messages from other users through the onMessageReceived() method of the channel event handler.
  ...
  });
```

<br />

## Additional information

Sendbird wants customers to be confident that Chat SDK will be useful, work well, and fit within their needs. Thus, we have compiled a couple of optional guidelines. Take a few minutes to read and apply them at your convenience.

### XSS prevention

XSS (Cross-site scripting) is a type of computer security vulnerability. XSS helps attackers inject client-side scripts into web pages viewed by other users. Users can send any type of string data without restriction through Chat SDKs. Make sure that you check the safety of received data from other users before rendering it into your DOM.

> **Note**: For more about the XSS prevention, visit the [OWASP's XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) page.

### Use functions of Sendbird objects with Immutable-js

If you are using the [Immutable-js](https://immutable-js.github.io/immutable-js/) in your web app, instead of the `Immutable.Map()`, call the `Immutable.fromJS()` which converts deeply nested objects to an `Immutable Map`.
So you can call the functions of Sendbird objects because the `fromJS()` method returns internal objects. But if you use a `Map` function, you can't call any functions of a Sendbird object.

```javascript
const userIds = ['John', 'Harry'];

const channel = await sb.groupChannel.createChannelWithUserIds(userIds, false, NAME, COVER_URL, DATA);

const immutableObject = Immutable.fromJS(channel);
```
