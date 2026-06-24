import { AppHeader } from "./components/layout/AppHeader";
import { TodoPage } from "./features/todos/TodoPage";

export default function App() {
  return (
    <div className="app">
      <AppHeader />
      <main className="main">
        <TodoPage />
      </main>
    </div>
  );
}
