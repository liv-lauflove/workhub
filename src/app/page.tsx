import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 h-screen w-full items-center justify-center bg-background text-foreground">
      <h1 className="text-3xl font-bold">Welcome to Workhub</h1>
      <Button>Click Me</Button>
    </div>
  );
}
