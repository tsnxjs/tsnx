import {
  ConstructorDependencies,
  IBindingBuilder,
  IHostedServiceBindingBuilder,
  InjectionToken,
  IServiceCollection,
  IServiceProvider,
  IServiceProviderRoot,
  ServiceDescriptor,
  ServiceFactory,
  ServiceIdentifier,
  ServiceLifetime,
  ServiceProviderOptions,
  ServiceToken,
} from './types.js';
import { HostedService, HOSTED_SERVICE_TOKEN } from '../hosted-services/types.js';
import { ServiceProvider } from './service-provider.js';
import { IOptionsBuilder } from '../options/types.js';
import { OptionsBuilder } from '../options/options-builder.js';

class BindingBuilder<T> implements IBindingBuilder<T> {
  constructor(
    private readonly collection: ServiceCollection,
    private readonly token: InjectionToken<T>,
    private readonly lifetime: ServiceLifetime,
  ) {}

  toClass(): IServiceCollection;
  toClass<C extends new (...args: any[]) => T>(
    ctor: C,
    ...dependencies: ConstructorDependencies<C>
  ): IServiceCollection;
  toClass<C extends new (...args: any[]) => T>(
    ctor?: C,
    ...dependencies: ConstructorDependencies<C>
  ): IServiceCollection {
    const implType = ctor ?? (typeof this.token === 'function' ? (this.token as any) : undefined);
    if (!implType) {
      throw new Error(`Cannot register toClass without an implementation class for token "${String(this.token)}".`);
    }

    this.collection.add({
      token: this.token,
      lifetime: this.lifetime,
      implementationType: implType,
      dependencies: dependencies.length > 0 ? (dependencies as any) : undefined,
    });
    return this.collection;
  }

  toFactory(factory: (sp: IServiceProvider) => T): IServiceCollection {
    this.collection.add({
      token: this.token,
      lifetime: this.lifetime,
      factory,
    });
    return this.collection;
  }

  toInstance(instance: T): IServiceCollection {
    this.collection.add({
      token: this.token,
      lifetime: this.lifetime,
      instance,
    });
    return this.collection;
  }
}

class HostedServiceBindingBuilder implements IHostedServiceBindingBuilder {
  constructor(private readonly collection: ServiceCollection) {}

  toClass<T extends HostedService, C extends new (...args: any[]) => T>(
    ctor: C,
    ...dependencies: ConstructorDependencies<C>
  ): IServiceCollection {
    this.collection.add({
      token: HOSTED_SERVICE_TOKEN,
      lifetime: 'singleton',
      implementationType: ctor,
      dependencies: dependencies as any,
      factory: (sp) => {
        const args = (dependencies as any[]).map((t) => sp.get(t));
        return new ctor(...(args as any));
      },
    });
    return this.collection;
  }

  toFactory<T extends HostedService>(
    factory: (sp: IServiceProvider) => T,
  ): IServiceCollection {
    this.collection.add({
      token: HOSTED_SERVICE_TOKEN,
      lifetime: 'singleton',
      factory,
    });
    return this.collection;
  }
}

export class ServiceCollection implements IServiceCollection {
  private readonly descriptors: ServiceDescriptor[] = [];

  [Symbol.iterator](): Iterator<ServiceDescriptor> {
    return this.descriptors[Symbol.iterator]();
  }

  get length(): number {
    return this.descriptors.length;
  }

  add<T>(descriptor: ServiceDescriptor<T>): this {
    this.descriptors.push(descriptor);
    return this;
  }

  addSingleton<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  addSingleton<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): this;
  addSingleton<T>(token: InjectionToken<T>, instance: T): this;
  addSingleton<T>(token: string, factory: (provider: IServiceProvider) => T): this;
  addSingleton<T>(token: string, instance: T): this;
  addSingleton<T>(
    tokenOrType: InjectionToken<T> | string,
    factoryOrInstance?: T | ServiceFactory<T>,
  ): IBindingBuilder<T> | this {
    if (factoryOrInstance === undefined) {
      return new BindingBuilder<T>(this, tokenOrType as InjectionToken<T>, 'singleton');
    }

    if (typeof factoryOrInstance === 'function') {
      return this.add({
        token: tokenOrType,
        lifetime: 'singleton',
        factory: factoryOrInstance as ServiceFactory<T>,
      });
    }

    return this.add({
      token: tokenOrType,
      lifetime: 'singleton',
      instance: factoryOrInstance,
    });
  }

  addScoped<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  addScoped<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): this;
  addScoped<T>(token: string, factory: (provider: IServiceProvider) => T): this;
  addScoped<T>(
    tokenOrType: InjectionToken<T> | string,
    factory?: ServiceFactory<T>,
  ): IBindingBuilder<T> | this {
    if (factory === undefined) {
      return new BindingBuilder<T>(this, tokenOrType as InjectionToken<T>, 'scoped');
    }

    return this.add({
      token: tokenOrType,
      lifetime: 'scoped',
      factory,
    });
  }

  addTransient<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  addTransient<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): this;
  addTransient<T>(token: string, factory: (provider: IServiceProvider) => T): this;
  addTransient<T>(
    tokenOrType: InjectionToken<T> | string,
    factory?: ServiceFactory<T>,
  ): IBindingBuilder<T> | this {
    if (factory === undefined) {
      return new BindingBuilder<T>(this, tokenOrType as InjectionToken<T>, 'transient');
    }

    return this.add({
      token: tokenOrType,
      lifetime: 'transient',
      factory,
    });
  }

  addHostedService(): IHostedServiceBindingBuilder;
  addHostedService<T extends HostedService>(factory: (sp: IServiceProvider) => T): this;
  addHostedService<T extends HostedService>(
    factory?: (sp: IServiceProvider) => T,
  ): IHostedServiceBindingBuilder | this {
    if (factory) {
      return this.add({
        token: HOSTED_SERVICE_TOKEN,
        lifetime: 'singleton',
        factory,
      });
    }
    return new HostedServiceBindingBuilder(this);
  }

  tryAdd<T>(descriptor: ServiceDescriptor<T>): boolean {
    const exists = this.descriptors.some((d) => d.token === descriptor.token);
    if (!exists) {
      this.add(descriptor);
      return true;
    }
    return false;
  }

  tryAddSingleton<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): boolean;
  tryAddSingleton<T>(token: InjectionToken<T>, instance: T): boolean;
  tryAddSingleton<T>(token: string, factory: (provider: IServiceProvider) => T): boolean;
  tryAddSingleton<T>(token: string, instance: T): boolean;
  tryAddSingleton<T>(token: InjectionToken<T> | string, factoryOrInstance: T | ServiceFactory<T>): boolean {
    const exists = this.descriptors.some((d) => d.token === token);
    if (!exists) {
      this.addSingleton(token as any, factoryOrInstance as any);
      return true;
    }
    return false;
  }

  tryAddScoped<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): boolean;
  tryAddScoped<T>(token: string, factory: (provider: IServiceProvider) => T): boolean;
  tryAddScoped<T>(token: InjectionToken<T> | string, factory: (provider: IServiceProvider) => T): boolean {
    const exists = this.descriptors.some((d) => d.token === token);
    if (!exists) {
      this.addScoped(token as any, factory);
      return true;
    }
    return false;
  }

  tryAddTransient<T>(token: InjectionToken<T>, factory: (provider: IServiceProvider) => T): boolean;
  tryAddTransient<T>(token: string, factory: (provider: IServiceProvider) => T): boolean;
  tryAddTransient<T>(token: InjectionToken<T> | string, factory: (provider: IServiceProvider) => T): boolean {
    const exists = this.descriptors.some((d) => d.token === token);
    if (!exists) {
      this.addTransient(token as any, factory);
      return true;
    }
    return false;
  }

  replace<T>(token: InjectionToken<T> | string, instance: T): this;
  replace<T>(token: InjectionToken<T> | string, factory: (provider: IServiceProvider) => T): this;
  replace<T>(token: InjectionToken<T>): IBindingBuilder<T>;
  replace<T>(
    token: InjectionToken<T> | string,
    factoryOrInstance?: T | ServiceFactory<T>,
  ): IBindingBuilder<T> | this {
    // Remove previous descriptors for token
    for (let i = this.descriptors.length - 1; i >= 0; i--) {
      if (this.descriptors[i].token === token) {
        this.descriptors.splice(i, 1);
      }
    }
    if (factoryOrInstance === undefined) {
      return new BindingBuilder<T>(this, token as InjectionToken<T>, 'singleton');
    }
    return this.addSingleton(token as any, factoryOrInstance as any);
  }

  find(token: ServiceIdentifier): ServiceDescriptor | undefined {
    // Return last registered descriptor for this token (overriding earlier ones)
    for (let i = this.descriptors.length - 1; i >= 0; i--) {
      if (this.descriptors[i].token === token) {
        return this.descriptors[i];
      }
    }
    return undefined;
  }

  findAll(token: ServiceIdentifier): ServiceDescriptor[] {
    return this.descriptors.filter((d) => d.token === token);
  }

  buildServiceProvider(options?: ServiceProviderOptions): IServiceProviderRoot {
    return new ServiceProvider(this.descriptors, true, undefined, undefined, options);
  }

  private readonly optionsBuilders = new Map<any, OptionsBuilder<any>>();

  configure<T>(token: InjectionToken<T> | ServiceToken<T> | string): IOptionsBuilder<T> {
    const existing = this.optionsBuilders.get(token);
    if (existing) {
      return existing as IOptionsBuilder<T>;
    }
    const builder = new OptionsBuilder<T>(this, token);
    this.optionsBuilders.set(token, builder);
    return builder;
  }
}
