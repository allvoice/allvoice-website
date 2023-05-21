import { createContext, useContext, type FC, type ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
};

function createContextHook<TValue>(name: string, hook: () => TValue) {
  const Context = createContext<TValue | null>(null);

  const Provider: FC<ProviderProps> = ({ children }) => {
    const value = hook();
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  function useNamedCustomHook(): TValue {
    const value = useContext(Context);

    if (value === null) {
      throw new Error(`use${name} must be used within a ${name}Provider`);
    }

    return value;
  }

  function withHook<TProps extends object>(
    WrappedComponent: React.ComponentType<TProps>
  ) {
    return function WrappedWithHook(props: TProps) {
      return (
        <Provider>
          <WrappedComponent {...props} />
        </Provider>
      );
    };
  }

  return [useNamedCustomHook, Provider, withHook] as const;
}

export default createContextHook;
