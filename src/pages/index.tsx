import { type NextPage } from "next";
import FileUploader from "~/components/FileUploader";
const Home: NextPage = () => {
  return (
    <div className="h-screen bg-red-500">
      <p>Hello! Testing the layout.</p>
      <FileUploader />
    </div>
  );
};

export default Home;
