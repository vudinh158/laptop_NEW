// import React from "react"
// import ReactDOM from "react-dom/client"
// import { BrowserRouter } from "react-router-dom"
// import { Provider } from "react-redux"
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
// import App from "./App"
// import { store } from "./store/store"
// import "./index.css"

// // Create React Query client
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       retry: 1,
//       staleTime: 5 * 60 * 1000, // 5 minutes
//     },
//   },
// })

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <Provider store={store}>
//       <QueryClientProvider client={queryClient}>
//         <App />
//       </QueryClientProvider>
//     </Provider>
//   </React.StrictMode>,
// )
