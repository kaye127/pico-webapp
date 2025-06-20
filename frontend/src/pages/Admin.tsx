import { useEffect, useState } from "react";

export default function Admin() {
  const [data, setData] = useState({ connectedTopics: [], latestData: {} });

  useEffect(() => {
    fetch("http://localhost:3000/api/stream")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Admin fetch error:", err));
  }, []);
console.log("d", data)
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="bg-white shadow rounded-md p-4">
        {data.connectedTopics.length === 0 ? (
          <p>No devices connected.</p>
        ) : (
          <ul className="space-y-3">
            {data.connectedTopics.map((topic) => (
              <li key={topic}>
                <strong>{topic}</strong>:{" "}
                <pre className="inline bg-gray-100 p-1 rounded text-sm">
                  {JSON.stringify(data.latestData[topic], null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
