import { type GetStaticProps, type NextPage } from "next";
import { useState } from "react";
import FileUploader from "~/components/FileUploader";
import createContextHook from "~/utils/createContextHook";

type Props = {
  ssrExampleProp: string;
};
export const [useExample, _, withExample] = createContextHook("example", () => {
  const [example, setExample] = useState("");

  return {
    example,
    setExample,
  };
});

const Example: NextPage<Props> = ({ ssrExampleProp }) => {
  const { example, setExample } = useExample();
  setExample(ssrExampleProp);
  return (
    <>
      {example}
      <FileUploader />
    </>
  );
};

export const getStaticProps: GetStaticProps<Props> = () => {
  return {
    props: {
      ssrExampleProp: "test string",
    },
  };
};

export default withExample(Example);
