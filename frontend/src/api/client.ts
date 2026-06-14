import axios from "axios";
import WebApp from "@twa-dev/sdk";

const client = axios.create({
  baseURL: "/api",
});

client.interceptors.request.use((config) => {
  const initData = WebApp.initData;
  if (initData) {
    config.headers["X-Init-Data"] = initData;
  }
  return config;
});

export default client;
