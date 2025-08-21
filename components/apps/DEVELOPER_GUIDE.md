# Developer Guide: Application Management System

This document explains the architecture and workflow for managing and launching applications within this simulated OS environment.

## 1. Core Philosophy (思路)

The application management system is designed to handle two distinct types of applications in a unified way:

-   **Internal Applications:** These are React components that run within the main application's context. They are part of the core codebase and are suitable for lightweight, integrated features (e.g., Settings, Notepad).

-   **External Applications:** These are completely separate, standalone Electron applications, each with their own `package.json` and dependencies. This allows for true modularity, where complex applications (like a browser or a terminal) can be developed and maintained independently.

The core challenge was to create a system where the App Store could discover and launch *any* generic external Electron app without needing special code for each one. The solution was to move away from a code-generation approach and towards a **data-driven registry system**.

A secondary goal is to ensure the UI (like the Start Menu) updates immediately after an app is installed. This is achieved via a decoupled **event-driven system**.

## 2. Key Files & Modules (用到的文件和模块)

The application system is primarily managed by the following files:

-   **`services/eventService.ts`**: A simple, singleton event emitter used for decoupled communication between components. It is used to notify the system when the app list has changed.
-   **`main/data/external-apps.json`**: The **External App Registry**. This JSON file is the source of truth for all *installed* external applications.
-   **`main/api.js`**: The backend Express server contains API endpoints for app management:
    -   `GET /api/apps`: Discovers potential external apps by scanning the `components/apps` directory.
    -   `POST /api/install`: "Installs" a new external app by adding its metadata to the `external-apps.json` registry.
-   **`components/apps/index.ts`**: The central app loader on the frontend. Its `getAppDefinitions` function builds a unified list of all internal (from `.tsx` files) and external (from the JSON registry) applications.
-   **`window/hooks/useWindowManager.ts`**: This hook is the stateful owner of the application list. It listens for the `apps-changed` event from the `eventService` and triggers a forced refresh of its app list.
-   **`window/components/AppStore/index.tsx`**: The App Store UI. After a successful installation, it emits the `apps-changed` event.
-   **`main/launcher.js`**: Contains the logic to launch an external Electron app as a separate OS process.

## 3. Implementation Details (成功实现的具体)

The workflow is as follows:

### App Discovery & Installation
1.  A developer places a new, self-contained Electron app folder into `components/apps/`.
2.  The user opens the **App Store**. It calls `GET /api/apps` to find all potential, not-yet-installed apps.
3.  The user clicks "Install".
4.  The App Store frontend calls `POST /api/install`. The backend adds a new entry to the `external-apps.json` registry file.
5.  After the API call succeeds, the App Store frontend **emits an `apps-changed` event** using the `eventService`.

### App List Refresh & Launching
1.  The `useWindowManager` hook, which is always active, is listening for the `apps-changed` event.
2.  Upon receiving the event, it calls its internal `refreshAppDefinitions` function.
3.  This function calls `getAppDefinitions(true)`, forcing it to bypass its cache and re-fetch the list of external apps from the (now updated) `external-apps.json` file.
4.  The `useWindowManager` hook updates its state with the new, complete list of apps.
5.  Because the UI components (like the Start Menu) get their app list from this hook, React automatically re-renders them, and the newly installed app appears immediately.
6.  When the user clicks the new app's icon, the `openApp` function in `useWindowManager` checks the `isExternal` flag and uses the `main/launcher.js` to execute it as a separate process.

## 4. Environment & Prerequisites (环境和模块)

-   **Node.js / npm:** The core runtime environment.
-   **Electron:** The host application and external applications are all Electron apps.
-   **Convention over Configuration:** External apps should have a valid `package.json` and a `main.js` entry point in their root directory.
