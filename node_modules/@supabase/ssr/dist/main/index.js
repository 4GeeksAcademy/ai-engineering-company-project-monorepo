"use strict";
// IMPORTANT: this file MUST stay free of top-level side effects so the
// package can advertise `"sideEffects": false` in package.json. Any new
// runtime initialization belongs inside a function called explicitly by a
// consumer entry point (createBrowserClient / createServerClient), not at
// module load time.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnIfUsingDeprecatedAuthHelpersPackage = exports.clearAuthCookiesAtScopes = void 0;
__exportStar(require("./createBrowserClient"), exports);
__exportStar(require("./createServerClient"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./utils"), exports);
var clearAuthCookiesAtScopes_1 = require("./clearAuthCookiesAtScopes");
Object.defineProperty(exports, "clearAuthCookiesAtScopes", { enumerable: true, get: function () { return clearAuthCookiesAtScopes_1.clearAuthCookiesAtScopes; } });
var warnDeprecatedPackage_1 = require("./warnDeprecatedPackage");
Object.defineProperty(exports, "warnIfUsingDeprecatedAuthHelpersPackage", { enumerable: true, get: function () { return warnDeprecatedPackage_1.warnIfUsingDeprecatedAuthHelpersPackage; } });
//# sourceMappingURL=index.js.map