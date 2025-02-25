import { DynamicLive } from "@/client/dynamc-live";

export default async function Home() {
  return (
    <div className="h-screen w-screen grid place-items-center">
      <DynamicLive />
    </div>
  );
}
