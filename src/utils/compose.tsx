import React, { type FC } from "react";

// https://stackoverflow.com/questions/51504506/too-many-react-context-providers
type Props = {
  components: Array<
    React.JSXElementConstructor<React.PropsWithChildren<unknown>>
  >;
  children: React.ReactNode;
};

export const Compose: FC<Props> = ({ components = [], children }) => {
  return (
    <>
      {components.reduceRight((acc, Comp) => {
        return <Comp>{acc}</Comp>;
      }, children)}
    </>
  );
};
