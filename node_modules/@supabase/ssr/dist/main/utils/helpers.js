"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = exports.parse = void 0;
exports.parseCookieHeader = parseCookieHeader;
exports.serializeCookieHeader = serializeCookieHeader;
exports.isBrowser = isBrowser;
exports.memoryLocalStorageAdapter = memoryLocalStorageAdapter;
const cookie = __importStar(require("cookie"));
/**
 * @deprecated Since v0.4.0: Please use {@link parseCookieHeader}. `parse` will
 * not be available for import starting v1.0.0 of `@supabase/ssr`.
 */
exports.parse = cookie.parse;
/**
 * @deprecated Since v0.4.0: Please use {@link serializeCookieHeader}.
 * `serialize` will not be available for import starting v1.0.0 of
 * `@supabase/ssr`.
 */
exports.serialize = cookie.serialize;
/**
 * Parses the `Cookie` HTTP header into an array of cookie name-value objects.
 *
 * @param header The `Cookie` HTTP header. Decodes cookie names and values from
 * URI encoding first.
 */
function parseCookieHeader(header) {
    const parsed = cookie.parse(header);
    return Object.keys(parsed ?? {}).map((name) => ({
        name,
        value: parsed[name],
    }));
}
/**
 * Converts the arguments to a valid `Set-Cookie` header. Non US-ASCII chars
 * and other forbidden cookie chars will be URI encoded.
 *
 * @param name Name of cookie.
 * @param value Value of cookie.
 */
function serializeCookieHeader(name, value, options) {
    return cookie.serialize(name, value, options);
}
function isBrowser() {
    return (typeof window !== "undefined" && typeof window.document !== "undefined");
}
/**
 * Returns a localStorage-like object that stores the key-value pairs in
 * memory.
 */
function memoryLocalStorageAdapter(store = {}) {
    return {
        getItem: (key) => {
            return store[key] || null;
        },
        setItem: (key, value) => {
            store[key] = value;
        },
        removeItem: (key) => {
            delete store[key];
        },
    };
}
//# sourceMappingURL=helpers.js.map