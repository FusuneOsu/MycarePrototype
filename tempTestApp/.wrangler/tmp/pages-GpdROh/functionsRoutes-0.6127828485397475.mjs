import { onRequestGet as __api_hello_js_onRequestGet } from "C:\\Users\\sword\\Desktop\\MycarePrototype\\MycarePrototype\\tempTestApp\\functions\\api\\hello.js"
import { onRequestPost as __api_hello_js_onRequestPost } from "C:\\Users\\sword\\Desktop\\MycarePrototype\\MycarePrototype\\tempTestApp\\functions\\api\\hello.js"

export const routes = [
    {
      routePath: "/api/hello",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_hello_js_onRequestGet],
    },
  {
      routePath: "/api/hello",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_hello_js_onRequestPost],
    },
  ]