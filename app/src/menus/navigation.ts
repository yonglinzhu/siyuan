import {
    copySubMenu,
    exportMd,
    movePathToMenu,
    openFileAttr,
    renameMenu,
} from "./commonMenuItem";
/// #if !BROWSER
import {FileFilter, shell} from "electron";
import {dialog as remoteDialog} from "@electron/remote";
import * as path from "path";
/// #endif
import {MenuItem} from "./Menu";
import {getDisplayName, getNotebookName, getTopPaths, pathPosix} from "../util/pathName";
import {hideMessage, showMessage} from "../dialog/message";
import {fetchPost} from "../util/fetch";
import {onGetnotebookconf} from "./onGetnotebookconf";
/// #if !MOBILE
import {openSearch} from "../search/spread";
import {openFileById} from "../editor/util";
/// #endif
import {Constants} from "../constants";
import {newFile} from "../util/newFile";
import {hasClosestByTag} from "../protyle/util/hasClosest";
import {deleteFiles} from "../editor/deleteFile";

const initMultiMenu = (selectItemElements: NodeListOf<Element>) => {
    const fileItemElement = Array.from(selectItemElements).find(item => {
        if (item.getAttribute("data-type") === "navigation-file") {
            return true
        }
    })
    if (!fileItemElement) {
        return window.siyuan.menus.menu;
    }
    window.siyuan.menus.menu.append(movePathToMenu(getTopPaths(
        Array.from(selectItemElements)
    )));
    window.siyuan.menus.menu.append(new MenuItem({
        icon: "iconTrashcan",
        label: window.siyuan.languages.delete,
        accelerator: "⌦",
        click: () => {
            deleteFiles(Array.from(selectItemElements));
        }
    }).element);
    return window.siyuan.menus.menu;
}

export const initNavigationMenu = (liElement: HTMLElement) => {
    window.siyuan.menus.menu.remove();
    const fileElement = hasClosestByTag(liElement, "DIV");
    if (!fileElement) {
        return window.siyuan.menus.menu;
    }
    if (!liElement.classList.contains("b3-list-item--focus")) {
        fileElement.querySelectorAll(".b3-list-item--focus").forEach(item => {
            item.classList.remove("b3-list-item--focus");
            item.removeAttribute("select-end");
            item.removeAttribute("select-start");
        });
        liElement.classList.add("b3-list-item--focus");
    }
    const selectItemElements = fileElement.querySelectorAll(".b3-list-item--focus")
    if (selectItemElements.length > 1) {
        return initMultiMenu(selectItemElements);
    }
    const notebookId = liElement.parentElement.getAttribute("data-url");
    const name = getNotebookName(notebookId);
    if (!window.siyuan.config.readonly) {
        window.siyuan.menus.menu.append(renameMenu({
            path: "/",
            notebookId,
            name,
            type: "notebook"
        }));
    }
    window.siyuan.menus.menu.append(new MenuItem({
        label: window.siyuan.languages.config,
        icon: "iconSettings",
        click: () => {
            fetchPost("/api/notebook/getNotebookConf", {
                notebook: notebookId
            }, (data) => {
                onGetnotebookconf(data.data);
            });
        }
    }).element);
    /// #if !MOBILE
    window.siyuan.menus.menu.append(new MenuItem({
        label: window.siyuan.languages.search,
        accelerator: window.siyuan.config.keymap.general.search.custom,
        icon: "iconSearch",
        click() {
            openSearch(window.siyuan.config.keymap.general.search.custom, undefined, notebookId);
        }
    }).element);
    window.siyuan.menus.menu.append(new MenuItem({
        label: window.siyuan.languages.replace,
        accelerator: window.siyuan.config.keymap.general.replace.custom,
        click() {
            openSearch(window.siyuan.config.keymap.general.replace.custom, undefined, notebookId);
        }
    }).element);
    /// #endif
    if (!window.siyuan.config.readonly) {
        window.siyuan.menus.menu.append(new MenuItem({type: "separator"}).element);
        window.siyuan.menus.menu.append(new MenuItem({
            label: window.siyuan.languages.close,
            icon: "iconClose",
            click: () => {
                fetchPost("/api/notebook/closeNotebook", {
                    notebook: notebookId
                });
            }
        }).element);
        window.siyuan.menus.menu.append(new MenuItem({
            icon: "iconTrashcan",
            label: window.siyuan.languages.delete,
            accelerator: "⌦",
            click: () => {
                deleteFiles(Array.from(fileElement.querySelectorAll(".b3-list-item--focus")));
            }
        }).element);
    }
    window.siyuan.menus.menu.append(new MenuItem({type: "separator"}).element);
    /// #if !BROWSER
    window.siyuan.menus.menu.append(new MenuItem({
        label: window.siyuan.languages.showInFolder,
        click: () => {
            shell.openPath(path.join(window.siyuan.config.system.dataDir, notebookId));
        }
    }).element);
    /// #endif
    genImportMenu(notebookId, "/");

    window.siyuan.menus.menu.append(new MenuItem({
        label: window.siyuan.languages.export,
        type: "submenu",
        icon: "iconUpload",
        submenu: [{
            label: "Markdown",
            icon: "iconMarkdown",
            click: () => {
                const msgId = showMessage(window.siyuan.languages.exporting, -1);
                fetchPost("/api/export/batchExportMd", {
                    notebook: notebookId,
                    path: "/"
                }, response => {
                    hideMessage(msgId);
                    window.open(response.data.zip);
                });
            }
        }, {
            label: "SiYuan .sy.zip",
            icon: "iconSiYuan",
            click: () => {
                const msgId = showMessage(window.siyuan.languages.exporting, -1);
                fetchPost("/api/export/exportNotebookSY", {
                    id: notebookId,
                }, response => {
                    hideMessage(msgId);
                    window.open(response.data.zip);
                });
            }
        }]
    }).element);
    return window.siyuan.menus.menu;
};

export const initFileMenu = (notebookId: string, pathString: string, liElement: Element) => {
    window.siyuan.menus.menu.remove();
    const fileElement = hasClosestByTag(liElement, "DIV");
    if (!fileElement) {
        return  window.siyuan.menus.menu;
    }
    if (!liElement.classList.contains("b3-list-item--focus")) {
        fileElement.querySelectorAll(".b3-list-item--focus").forEach(item => {
            item.classList.remove("b3-list-item--focus");
            item.removeAttribute("select-end");
            item.removeAttribute("select-start");
        });
        liElement.classList.add("b3-list-item--focus");
    }
    const selectItemElements = fileElement.querySelectorAll(".b3-list-item--focus")
    if (selectItemElements.length > 1) {
        return initMultiMenu(selectItemElements);
    }
    const id = liElement.getAttribute("data-node-id");
    let name = liElement.getAttribute("data-name");
    name = getDisplayName(name, false, true);
    if (!window.siyuan.config.readonly) {
        if (window.siyuan.config.fileTree.sort === 6) {
            window.siyuan.menus.menu.append(new MenuItem({
                icon: "iconBefore",
                label: window.siyuan.languages.newDocAbove,
                click: () => {
                    const paths: string[] = [];
                    Array.from(liElement.parentElement.children).forEach((item) => {
                        if (item.tagName === "LI") {
                            if (item.isSameNode(liElement)) {
                                paths.push(undefined);
                            }
                            paths.push(item.getAttribute("data-path"));
                        }
                    });
                    newFile(notebookId, pathPosix().dirname(pathString), true, paths);
                }
            }).element);
            window.siyuan.menus.menu.append(new MenuItem({
                icon: "iconAfter",
                label: window.siyuan.languages.newDocBelow,
                click: () => {
                    const paths: string[] = [];
                    Array.from(liElement.parentElement.children).forEach((item) => {
                        if (item.tagName === "LI") {
                            paths.push(item.getAttribute("data-path"));
                            if (item.isSameNode(liElement)) {
                                paths.push(undefined);
                            }
                        }
                    });
                    newFile(notebookId, pathPosix().dirname(pathString), true, paths);
                }
            }).element);
            window.siyuan.menus.menu.append(new MenuItem({type: "separator"}).element);
        }
        window.siyuan.menus.menu.append(new MenuItem({
            label: window.siyuan.languages.copy,
            type: "submenu",
            icon: "iconCopy",
            submenu: (copySubMenu(id, false) as IMenu[]).concat([{
                label: window.siyuan.languages.duplicate,
                accelerator: window.siyuan.config.keymap.editor.general.duplicate.custom,
                click() {
                    fetchPost("/api/filetree/duplicateDoc", {
                        id
                    });
                }
            }])
        }).element);
        window.siyuan.menus.menu.append(movePathToMenu(getTopPaths(
            Array.from(fileElement.querySelectorAll(".b3-list-item--focus"))
        )));
        window.siyuan.menus.menu.append(new MenuItem({
            icon: "iconTrashcan",
            label: window.siyuan.languages.delete,
            accelerator: "⌦",
            click: () => {
                deleteFiles(Array.from(fileElement.querySelectorAll(".b3-list-item--focus")));
            }
        }).element);
        window.siyuan.menus.menu.append(new MenuItem({type: "separator"}).element);
        window.siyuan.menus.menu.append(renameMenu({
            path: pathString,
            notebookId,
            name,
            type: "file"
        }));
        window.siyuan.menus.menu.append(new MenuItem({
            label: window.siyuan.languages.attr,
            click() {
                fetchPost("/api/block/getDocInfo", {
                    id
                }, (response) => {
                    openFileAttr(response.data.ial, id);
                });
            }
        }).element);

        /// #if !MOBILE
        window.siyuan.menus.menu.append(new MenuItem({
            label: window.siyuan.languages.search,
            icon: "iconSearch",
            accelerator: window.siyuan.config.keymap.general.search.custom,
            click() {
                openSearch(window.siyuan.config.keymap.general.search.custom, undefined, notebookId, getDisplayName(pathString, false, true));
            }
        }).element);
        window.siyuan.menus.menu.append(new MenuItem({
            label: window.siyuan.languages.replace,
            accelerator: window.siyuan.config.keymap.general.replace.custom,
            click() {
                openSearch(window.siyuan.config.keymap.general.replace.custom, undefined, notebookId, getDisplayName(pathString, false, true));
            }
        }).element);
        /// #endif
        window.siyuan.menus.menu.append(new MenuItem({type: "separator"}).element);
    }
    /// #if !MOBILE
    const openSubmenus: IMenu[] = [{
        icon: "iconLayoutRight",
        label: window.siyuan.languages.insertRight,
        accelerator: "⌥Click",
        click: () => {
            openFileById({id, position: "right", action: [Constants.CB_GET_FOCUS]});
        }
    }, {
        icon: "iconLayoutBottom",
        label: window.siyuan.languages.insertBottom,
        accelerator: "⇧Click",
        click: () => {
            openFileById({id, position: "bottom", action: [Constants.CB_GET_FOCUS]});
        }
    }];
    if (window.siyuan.config.fileTree.openFilesUseCurrentTab) {
        openSubmenus.push({
            label: window.siyuan.languages.openInNewTab,
            accelerator: "⌥⌘Click",
            click: () => {
                openFileById({
                    id, action: [Constants.CB_GET_FOCUS],
                    removeCurrentTab: false
                });
            }
        });
    }
    openSubmenus.push({type: "separator"});
    openSubmenus.push({
        icon: "iconPreview",
        label: window.siyuan.languages.preview,
        click: () => {
            openFileById({id, mode: "preview"});
        }
    });
    /// #if !BROWSER
    openSubmenus.push({type: "separator"});
    if (!window.siyuan.config.readonly) {
        openSubmenus.push({
            label: window.siyuan.languages.showInFolder,
            click: () => {
                shell.showItemInFolder(path.join(window.siyuan.config.system.dataDir, notebookId, pathString));
            }
        });
    }
    /// #endif
    window.siyuan.menus.menu.append(new MenuItem({
        label: window.siyuan.languages.openBy,
        submenu: openSubmenus,
    }).element);
    /// #endif
    genImportMenu(notebookId, pathString);
    window.siyuan.menus.menu.append(exportMd(id));
    return window.siyuan.menus.menu;
};

const genImportMenu = (notebookId: string, pathString: string) => {
    if (!window.siyuan.config.readonly) {
        /// #if !BROWSER
        const importstdmd = (label: string, isDoc?: boolean) => {
            return {
                icon: isDoc ? "iconMarkdown" : "iconFolder",
                label,
                click: async () => {
                    let filters: FileFilter[] = [];
                    if (isDoc) {
                        filters = [{name: "Markdown", extensions: ["md", "markdown"]}];
                    }
                    const localPath = await remoteDialog.showOpenDialog({
                        defaultPath: window.siyuan.config.system.homeDir,
                        filters,
                        properties: [isDoc ? "openFile" : "openDirectory"],
                    });
                    if (localPath.filePaths.length === 0) {
                        return;
                    }
                    fetchPost("/api/import/importStdMd", {
                        notebook: notebookId,
                        localPath: localPath.filePaths[0],
                        toPath: pathString,
                    });
                }
            };
        };
        /// #endif
        window.siyuan.menus.menu.append(new MenuItem({
            icon: "iconDownload",
            label: window.siyuan.languages.import,
            submenu: [{
                icon: "iconSiYuan",
                label: 'SiYuan .sy.zip<input class="b3-form__upload" type="file" accept="application/zip">',
                bind: (element) => {
                    element.querySelector(".b3-form__upload").addEventListener("change", (event: InputEvent & { target: HTMLInputElement }) => {
                        const formData = new FormData();
                        formData.append("file", event.target.files[0]);
                        formData.append("notebook", notebookId);
                        formData.append("toPath", pathString);
                        fetchPost("/api/import/importSY", formData);
                    });
                }
            },
                /// #if !BROWSER
                importstdmd("Markdown " + window.siyuan.languages.doc, true),
                importstdmd("Markdown " + window.siyuan.languages.folder)
                /// #endif
            ],
        }).element);
    }
};
