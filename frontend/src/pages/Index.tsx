import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function Index() {
  const [topic, setTopic] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (topic.trim()) {
      navigate(`/${topic.trim()}`);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen px-4">
      <Card>
        <CardHeader>
          <CardTitle>Connect to Your Device</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CardContent>
            <input
              type="text"
              placeholder="Enter unique topic name"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border px-3 py-2 rounded-md w-64"
              required
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="text-white w-full">
              Connect
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
