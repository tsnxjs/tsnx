import type { HostedService } from '../hosted-services/types.js';
import type { IOptionsBuilder } from '../options/types.js';

export type ServiceLifetime = 'singleton' | 'scoped' | 'transient';

declare const tokenType: unique symbol;

export type ServiceToken<T> = symbol & {
  readonly [tokenType]: (value: T) => T;
};

export function createToken<T>(description: string): ServiceToken<T> {
  return Symbol(description) as ServiceToken<T>;
}

export type Constructor<T = any> = new (...args: any[]) => T;
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

export type ConstructorDependencies<C> =
  C extends new (...args: infer TArgs) => any
    ? { [K in keyof TArgs]: InjectionToken<TArgs[K]> }
    : never;

export type InjectionToken<T = any> =
  | ServiceToken<T>
  | Constructor<T>
  | AbstractConstructor<T>;

export type ServiceIdentifier<T = any> =
  | InjectionToken<T>
  | string
  | symbol;

export type ServiceFactory<T = any> = (provider: IServiceProvider) => T;

export interface ServiceDescriptor<T = any> {
  token: ServiceIdentifier<T>;
  lifetime: ServiceLifetime;
  factory?: ServiceFactory<T>;
  instance?: T;
  implementationType?: new (...args: any[]) => T;
  dependencies?: ServiceIdentifier<any>[];
}

export interface IServiceProvider {
  get<T>(token: InjectionToken<T>): T;
  get<T = any>(token: ServiceIdentifier<T>): T;
  getOptional<T>(token: InjectionToken<T>): T | undefined;
  getOptional<T = any>(token: ServiceIdentifier<T>): T | undefined;
  isOwned?(instance: unknown): boolean;
}

export interface IServiceProviderScope extends IServiceProvider {
  readonly serviceProvider: IServiceProvider;
  dispose(): Promise<void>;
  [Symbol.asyncDispose]?(): Promise<void>;
}

export interface IServiceProviderRoot extends IServiceProvider {
  createScope(): IServiceProviderScope;
  dispose(): Promise<void>;
  [Symbol.asyncDispose]?(): Promise<void>;
}

export type IServiceScope = IServiceProviderScope;

export interface Disposable {
  dispose(): void | Promise<void>;
}

export interface ServiceProviderOptions {
  validateOnBuild?: boolean;
  validateScopes?: boolean;
}

export interface IBindingBuilder<T> {
  toClass(): IServiceCollection;
  toClass<C extends new (...args: any[]) => T>(
    ctor: C,
    ...dependencies: ConstructorDependencies<C>
  ): IServiceCollection;
  toFactory(factory: (sp: IServiceProvider) => T): IServiceCollection;
  toInstance(instance: T): IServiceCollection;
}

export interface IHostedServiceBindingBuilder {
  toClass<T extends HostedService, C extends new (...args: any[]) => T>(
    ctor: C,
    ...dependencies: ConstructorDependencies<C>
  ): IServiceCollection;
  toFactory<T extends HostedService>(
    factory: (sp: IServiceProvider) => T
  ): IServiceCollection;
}

export interface IServiceCollection extends Iterable<ServiceDescriptor> {
  readonly length: number;
  add<T>(descriptor: ServiceDescriptor<T>): this;

  // Singleton
  addSingleton<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  addSingleton<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): this;
  addSingleton<T>(token: InjectionToken<T>, instance: T): this;
  addSingleton<T>(token: string, factory: (provider: IServiceProvider) => T): this;
  addSingleton<T>(token: string, instance: T): this;

  // Scoped
  addScoped<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  addScoped<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): this;
  addScoped<T>(token: string, factory: (provider: IServiceProvider) => T): this;

  // Transient
  addTransient<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  addTransient<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): this;
  addTransient<T>(token: string, factory: (provider: IServiceProvider) => T): this;

  // Hosted Service
  addHostedService(): IHostedServiceBindingBuilder;
  addHostedService<T extends HostedService>(factory: (sp: IServiceProvider) => T): this;

  // TryAdd variants
  tryAdd<T>(descriptor: ServiceDescriptor<T>): boolean;
  tryAddSingleton<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): boolean;
  tryAddSingleton<T>(token: InjectionToken<T>, instance: T): boolean;
  tryAddSingleton<T>(token: string, factory: (provider: IServiceProvider) => T): boolean;
  tryAddSingleton<T>(token: string, instance: T): boolean;
  tryAddScoped<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): boolean;
  tryAddScoped<T>(token: string, factory: (provider: IServiceProvider) => T): boolean;
  tryAddTransient<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): boolean;
  // Replace
  replace<T>(token: InjectionToken<T> | string, instance: T): this;
  replace<T>(token: InjectionToken<T> | string, factory: (provider: IServiceProvider) => T): this;
  replace<T>(token: InjectionToken<T>): IBindingBuilder<T>;

  find(token: ServiceIdentifier): ServiceDescriptor | undefined;
  findAll(token: ServiceIdentifier): ServiceDescriptor[];
  buildServiceProvider(options?: ServiceProviderOptions): IServiceProviderRoot;

  // Options Pattern
  configure<T>(token: InjectionToken<T> | ServiceToken<T> | string): IOptionsBuilder<T>;
}
