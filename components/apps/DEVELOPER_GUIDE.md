# Developer Guide: Application Management System

This document explains the architecture and workflow for managing and launching applications within this simulated OS environment.

## 1. Core Philosophy (思路)

The application management system is designed to handle two distinct types of applications in a unified way:

-   **Internal Applications:** These are React components that run within the main application's context. They are part of the core codebase and are suitable for lightweight, integrated features (e.g., Settings, Notepad).

-   **External Applications:** These are completely separate, standalone Electron applications, each with their own `package.json` and dependencies. This allows for true modularity, where complex applications (like a browser or a terminal) can be developed and maintained independently.

The core challenge was to create a system where the App Store could discover and launch *any* generic external Electron app without needing special code for each one. The solution was to move away from a code-generation approach and towards a **data-driven registry system**.

## 2. Key Files & Modules (用到的文件和模块)

The application system is primarily managed by the following files:

-   **`components/apps/DEVELOPER_GUIDE.md`**: (This file) The main documentation for the system.
-   **`main/data/external-apps.json`**: The **External App Registry**. This JSON file is the source of truth for all *installed* external applications.
-   **`main/api.js`**: The backend Express server contains three critical API endpoints:
    -   `GET /api/apps`: Discovers potential external apps by scanning the `components/apps` directory for `package.json` files. It compares this list against the registry to determine which apps are "installed".
    -   `POST /api/install`: "Installs" a new external app by adding its metadata to the `external-apps.json` registry.
    -   `GET /api/apps/external`: Serves the contents of the `external-apps.json` registry to the frontend.
-   **`components/apps/index.ts`**: The central app loader on the frontend. Its `getAppDefinitions` function:
    -   Finds all **internal** apps by dynamically importing `*App.tsx` files.
    -   Fetches the list of **external** apps from the `/api/apps/external` endpoint.
    -   Merges these two lists into a single, unified list of `AppDefinition` objects.
-   **`window/hooks/useWindowManager.ts`**: The `openApp` function within this hook is the single entry point for launching any app. It inspects the `isExternal` flag on the app's definition to decide which launch mechanism to use.
-   **`main/launcher.js`**: Contains the `launchExternalAppByPath` function, which uses Node.js's `child_process.spawn` to launch an external Electron app as a new OS process.
-   **`preload.js` & `main/ipc.js`**: These files form the bridge that allows the frontend (`useWindowManager`) to securely call the backend launcher function.

## 3. Implementation Details (成功实现的具体)

The workflow is as follows:

### App Discovery & Installation
1.  A developer places a new, self-contained Electron app folder into `components/apps/`.
2.  The user opens the **App Store**.
3.  The App Store frontend calls `GET /api/apps`.
4.  The backend scans the `components/apps/` directory, finds the new app's `package.json`, sees it's not in `external-apps.json`, and returns it as an uninstalled app.
5.  The user clicks "Install".
6.  The App Store frontend calls `POST /api/install` with the app's metadata.
7.  The backend adds a new entry to the `external-apps.json` registry file and saves it. The installation is now complete.

### App Launching
1.  When the main application starts, the `useWindowManager` hook calls `getAppDefinitions`.
2.  `getAppDefinitions` builds a complete list of all apps:
    -   Internal apps are found by scanning for `*App.tsx` files.
    -   External apps are found by fetching the list from `main/data/external-apps.json` via the API.
3.  The user clicks on an app icon (e.g., on the Desktop or in the Start Menu).
4.  The `openApp` function in `useWindowManager` is called.
5.  It checks the app's definition.
    -   If `isExternal` is `false` or missing, it opens the app as a new React component window.
    -   If `isExternal` is `true`, it calls the `launchExternalApp` function via the Electron IPC bridge.
6.  The backend `launcher.js` receives the call and executes the external app in a new, separate process, achieving true application isolation.

## 4. Environment & Prerequisites (环境和模块)

-   **Node.js / npm:** The core runtime environment. External apps are expected to be valid Node.js projects.
-   **Electron:** The host application is an Electron app. External apps *must* also be Electron apps to be launched correctly by the `process.execPath` command in the launcher.
-   **Convention over Configuration:** For the system to work smoothly, external apps should follow a standard structure:
    -   Have a valid `package.json` file in their root directory.
    -   Define their entry point as `main.js` in their root directory. This is the path the installer assumes when creating the registry entry.
