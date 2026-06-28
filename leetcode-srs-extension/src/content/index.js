import { installFetchInterceptor } from "./fetch-interceptor.js";
import { installDomWatcher } from "./dom-watcher.js";

installFetchInterceptor();
installDomWatcher();

console.log("[LeetCode Galaxy] Content script loaded and monitoring submissions.");
