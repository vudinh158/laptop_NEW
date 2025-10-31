import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { store } from "./store/store"
import api from "./services/api"
import { setCredentials } from "./store/slices/authSlice"
import App from "./App"
import "../src/index.css"

// --- AUTH BOOTSTRAP: nạp lại token & user vào Redux + axios trước khi render
const token = localStorage.getItem("token");
const rawUser = localStorage.getItem("user");
if (token && rawUser) {
  try {
    const user = JSON.parse(rawUser);
    // set Redux isAuthenticated=true sớm
    store.dispatch(setCredentials({ token, user }));
    // set axios Authorization ngay từ đầu
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } catch (_) {}
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
)
