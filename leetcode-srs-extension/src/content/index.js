import { installInterceptorBridge } from "./fetch-interceptor.js";
import { installDomWatcher } from "./dom-watcher.js";

installInterceptorBridge();
installDomWatcher();

console.log("[LeetCode Galaxy] Content script loaded and monitoring submissions.");
