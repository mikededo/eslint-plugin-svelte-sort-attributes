import { RuleTester } from 'eslint';
import path from 'node:path';
import svelteParser from 'svelte-eslint-parser';
import { dedent } from 'ts-dedent';

import rule from './sort-attributes';

const ruleName = 'sort-svelte-attributes';

const parserWithEslint10Compat = {
  ...svelteParser,
  parseForESLint(code: string, options: Record<string, unknown>) {
    const parsed = svelteParser.parseForESLint(code, options);
    const maybeScopeManager = parsed.scopeManager as
      | {
        addGlobals?: (names: string[]) => void;
        globalScope?: { set?: Map<string, any>; variables?: any[] };
        scopes?: Array<{ set?: Map<string, any>; variables?: any[] }>;
      } |
      undefined;

    if (maybeScopeManager && typeof maybeScopeManager.addGlobals !== 'function') {
      maybeScopeManager.addGlobals = (names: string[]) => {
        const globalScope = maybeScopeManager.globalScope ?? maybeScopeManager.scopes?.at(0);
        if (!globalScope) {
          return;
        }

        globalScope.set ??= new Map();
        globalScope.variables ??= [];

        for (const name of names) {
          if (!globalScope.set.has(name)) {
            const variable = {
              defs: [],
              eslintExplicitGlobal: false,
              eslintExplicitGlobalComments: undefined,
              eslintImplicitGlobalSetting: undefined,
              eslintUsed: false,
              identifiers: [],
              name,
              references: [],
              writeable: false
            };
            globalScope.set.set(name, variable);
            globalScope.variables.push(variable);
          }
        }
      };
    }

    return parsed;
  }
};

describe(ruleName, () => {
  RuleTester.describe = describe;
  RuleTester.it = it;

  const ruleTester = new RuleTester({
    languageOptions: {
      parser: parserWithEslint10Compat,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(__dirname, '../fixtures')
      }
    }
  });

  describe(`${ruleName}: sorting by alphabetical order`, () => {
    const type = 'alphabetical-order';
    const options = {
      ignoreCase: true,
      order: 'asc',
      type: 'alphabetical'
    } as const;

    ruleTester.run(
      `${ruleName}(${type}): sorts props in svelte components`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component b="bb" a="aaa" d c="c" />
            `,
            errors: [
              {
                data: {
                  left: 'b',
                  right: 'a'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              },
              {
                data: {
                  left: 'd',
                  right: 'c'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component a="aaa" b="bb" c="c" d />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component a="aaa" b="bb" c="c" d />
            `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): works with spread attributes`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} b="b" a="aa" />
            `,
            errors: [
              {
                data: {
                  left: 'b',
                  right: 'a'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} a="aa" b="b" />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} a="aa" b="b" />
            `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): works with directives`,
      rule,
      {
        invalid: [
          {
            code: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component use:clickOutside on:outClick={() => (s = false)} />
            {/if}
          `,
            errors: [
              {
                data: {
                  left: 'use:clickOutside',
                  right: 'on:outClick'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `
          }
        ],
        valid: [
          {
            code: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set shorthand attributes position`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                d
                {c}
                b="b"
              />
            `,
            errors: [
              {
                data: {
                  left: 'd',
                  right: 'c'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              },
              {
                data: {
                  left: 'c',
                  leftGroup: 'svelte-shorthand',
                  right: 'b',
                  rightGroup: 'unknown'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['unknown', ['svelte-shorthand', 'shorthand']]
              }
            ],
            output: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                b="b"
                {c}
                d
              />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                b="b"
                {c}
                d
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['unknown', ['svelte-shorthand', 'shorthand']]
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set multiline attributes position`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                a="aa"
                b="b"
                c={c}
                onClick={() => {
                  c += 1
                }}
              />
            `,
            errors: [
              {
                data: {
                  left: 'c',
                  leftGroup: 'unknown',
                  right: 'onClick',
                  rightGroup: 'multiline'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['multiline', 'unknown']
              }
            ],
            output: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                onClick={() => {
                  c += 1
                }}
                a="aa"
                b="b"
                c={c}
              />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                onClick={() => {
                  c += 1
                }}
                a="aa"
                b="b"
                c={c}
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['multiline', 'unknown']
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set custom groups`,
      rule,
      {
        invalid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              a="aaa"
              b="bb"
              c="c"
              d={() => {
                /* ... */
              }}
            />
          `,
            errors: [
              {
                data: {
                  left: 'b',
                  leftGroup: 'unknown',
                  right: 'c',
                  rightGroup: 'ce'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  ce: ['c', 'e'],
                  d: 'd'
                },
                groups: ['ce', 'd', 'unknown']
              }
            ],
            output: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              c="c"
              d={() => {
                /* ... */
              }}
              a="aaa"
              b="bb"
            />
          `
          }
        ],
        valid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              c="c"
              d={() => {
                /* ... */
              }}
              a="aaa"
              b="bb"
            />
          `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  ce: ['c', 'e'],
                  d: 'd'
                },
                groups: ['ce', 'd', 'unknown']
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to use regex matcher for custom groups`,
      rule,
      {
        invalid: [],
        valid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              iHaveFooInMyName="iHaveFooInMyName"
              meTooIHaveFoo="meTooIHaveFoo"
              a="a"
              b="b"
            />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  elementsWithoutFoo: '^(?!.*Foo).*$'
                },
                groups: ['unknown', 'elementsWithoutFoo'],
                matcher: 'regex'
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to trim special characters`,
      rule,
      {
        invalid: [],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '~/file.svelte'
              </script>

              <Component
                {a}
                b="b"
                {c}
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                specialCharacters: 'trim'
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to remove special characters`,
      rule,
      {
        invalid: [],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '~/file.svelte'
              </script>
              <Component
                ab
                a$c
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                specialCharacters: 'remove'
              }
            ]
          }
        ]
      }
    );
  });

  describe(`${ruleName}: sorting by natural order`, () => {
    const type = 'natural-order';
    const options = {
      ignoreCase: true,
      order: 'asc',
      type: 'alphabetical'
    } as const;

    ruleTester.run(
      `${ruleName}(${type}): sorts props in svelte components`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component b="bb" a="aaa" d c="c" />
            `,
            errors: [
              {
                data: {
                  left: 'b',
                  right: 'a'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              },
              {
                data: {
                  left: 'd',
                  right: 'c'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component a="aaa" b="bb" c="c" d />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component a="aaa" b="bb" c="c" d />
            `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): works with spread attributes`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} b="b" a="aa" />
            `,
            errors: [
              {
                data: {
                  left: 'b',
                  right: 'a'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} a="aa" b="b" />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} a="aa" b="b" />
            `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): works with directives`,
      rule,
      {
        invalid: [
          {
            code: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component use:clickOutside on:outClick={() => (s = false)} />
            {/if}
          `,
            errors: [
              {
                data: {
                  left: 'use:clickOutside',
                  right: 'on:outClick'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `
          }
        ],
        valid: [
          {
            code: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set shorthand attributes position`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                d
                {c}
                b="b"
              />
            `,
            errors: [
              {
                data: {
                  left: 'd',
                  right: 'c'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              },
              {
                data: {
                  left: 'c',
                  leftGroup: 'svelte-shorthand',
                  right: 'b',
                  rightGroup: 'unknown'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['unknown', ['svelte-shorthand', 'shorthand']]
              }
            ],
            output: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                b="b"
                {c}
                d
              />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                b="b"
                {c}
                d
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['unknown', ['svelte-shorthand', 'shorthand']]
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set multiline attributes position`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                a="aa"
                b="b"
                c={c}
                onClick={() => {
                  c += 1
                }}
              />
            `,
            errors: [
              {
                data: {
                  left: 'c',
                  leftGroup: 'unknown',
                  right: 'onClick',
                  rightGroup: 'multiline'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['multiline', 'unknown']
              }
            ],
            output: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                onClick={() => {
                  c += 1
                }}
                a="aa"
                b="b"
                c={c}
              />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                onClick={() => {
                  c += 1
                }}
                a="aa"
                b="b"
                c={c}
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['multiline', 'unknown']
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set custom groups`,
      rule,
      {
        invalid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              a="aaa"
              b="bb"
              c="c"
              d={() => {
                /* ... */
              }}
            />
          `,
            errors: [
              {
                data: {
                  left: 'b',
                  leftGroup: 'unknown',
                  right: 'c',
                  rightGroup: 'ce'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  ce: ['c', 'e'],
                  d: 'd'
                },
                groups: ['ce', 'd', 'unknown']
              }
            ],
            output: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              c="c"
              d={() => {
                /* ... */
              }}
              a="aaa"
              b="bb"
            />
          `
          }
        ],
        valid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              c="c"
              d={() => {
                /* ... */
              }}
              a="aaa"
              b="bb"
            />
          `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  ce: ['c', 'e'],
                  d: 'd'
                },
                groups: ['ce', 'd', 'unknown']
              }
            ]
          }
        ]
      }
    );
  });

  describe(`${ruleName}: sorting by line length`, () => {
    const type = 'line-length-order';
    const options = {
      order: 'desc',
      type: 'line-length'
    } as const;

    ruleTester.run(
      `${ruleName}(${type}): sorts props in svelte components`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component b="bb" a="aaa" d c="c" />
            `,
            errors: [
              {
                data: {
                  left: 'b',
                  right: 'a'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              },
              {
                data: {
                  left: 'd',
                  right: 'c'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component a="aaa" b="bb" c="c" d />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'
              </script>

              <Component a="aaa" b="bb" c="c" d />
            `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): works with spread attributes`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} b="b" a="aa" />
            `,
            errors: [
              {
                data: {
                  left: 'b',
                  right: 'a'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} a="aa" b="b" />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file.svelte'

                let data = {}
              </script>

              <Component c {...data} a="aa" b="b" />
            `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): works with directives`,
      rule,
      {
        invalid: [
          {
            code: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button a="aa" on:click={() => (s = true)}>Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `,
            errors: [
              {
                data: {
                  left: 'a',
                  right: 'on:click'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              }
            ],
            filename: 'file.svelte',
            options: [options],
            output: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button on:click={() => (s = true)} a="aa">Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `
          }
        ],
        valid: [
          {
            code: dedent`
            <script>
              import { clickOutside } from './click-outside.js'
              import Component from './file.svelte'

              let s = true
            </script>

            <button on:click={() => (s = true)} a="aa">Show</button>
            {#if s}
              <Component on:outClick={() => (s = false)} use:clickOutside />
            {/if}
          `,
            filename: 'file.svelte',
            options: [options]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set shorthand attributes position`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                d
                {c}
                b="b"
              />
            `,
            errors: [
              {
                data: {
                  left: 'd',
                  right: 'c'
                },
                messageId: 'unexpectedSvelteAttributesOrder'
              },
              {
                data: {
                  left: 'c',
                  leftGroup: 'svelte-shorthand',
                  right: 'b',
                  rightGroup: 'unknown'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['unknown', ['svelte-shorthand', 'shorthand']]
              }
            ],
            output: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                b="b"
                {c}
                d
              />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = true
              </script>

              <Component
                a="aa"
                b="b"
                {c}
                d
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['unknown', ['svelte-shorthand', 'shorthand']]
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set multiline attributes position`,
      rule,
      {
        invalid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                a="aa"
                b="b"
                c={c}
                onClick={() => {
                  c += 1
                }}
              />
            `,
            errors: [
              {
                data: {
                  left: 'c',
                  leftGroup: 'unknown',
                  right: 'onClick',
                  rightGroup: 'multiline'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['multiline', 'unknown']
              }
            ],
            output: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                onClick={() => {
                  c += 1
                }}
                a="aa"
                b="b"
                c={c}
              />
            `
          }
        ],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../components/file.svelte'

                let c = 0
              </script>

              <Component
                onClick={() => {
                  c += 1
                }}
                a="aa"
                b="b"
                c={c}
              />
            `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                groups: ['multiline', 'unknown']
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}(${type}): allows to set custom groups`,
      rule,
      {
        invalid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              a="aaa"
              b="bb"
              c="c"
              d={() => {
                /* ... */
              }}
            />
          `,
            errors: [
              {
                data: {
                  left: 'b',
                  leftGroup: 'unknown',
                  right: 'c',
                  rightGroup: 'ce'
                },
                messageId: 'unexpectedSvelteAttributesGroupOrder'
              }
            ],
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  ce: ['c', 'e'],
                  d: 'd'
                },
                groups: ['ce', 'd', 'unknown']
              }
            ],
            output: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              c="c"
              d={() => {
                /* ... */
              }}
              a="aaa"
              b="bb"
            />
          `
          }
        ],
        valid: [
          {
            code: dedent`
            <script>
              import Component from '~/file.svelte'
            </script>

            <Component
              c="c"
              d={() => {
                /* ... */
              }}
              a="aaa"
              b="bb"
            />
          `,
            filename: 'file.svelte',
            options: [
              {
                ...options,
                customGroups: {
                  ce: ['c', 'e'],
                  d: 'd'
                },
                groups: ['ce', 'd', 'unknown']
              }
            ]
          }
        ]
      }
    );
  });

  describe(`${ruleName}: validating group configuration`, () => {
    ruleTester.run(
      `${ruleName}: allows predefined groups and defined custom groups`,
      rule,
      {
        invalid: [],
        valid: [
          {
            code: dedent`
              <script>
                import Component from '../file2.svelte'
              </script>

              <Component a="aaa" b="bb" />
            `,
            filename: 'file.svelte',
            options: [
              {
                customGroups: {
                  myCustomGroup: 'x'
                },
                groups: [
                  'svelte-shorthand',
                  'multiline',
                  'shorthand',
                  'unknown',
                  'myCustomGroup'
                ]
              }
            ]
          }
        ]
      }
    );
  });

  describe(`${ruleName}: misc`, () => {
    ruleTester.run(
      `${ruleName}: works only with .svelte files`,
      rule,
      {
        invalid: [],
        valid: [
          {
            code: dedent`
            <Component c="c" b="bb" a="aaa" />
          `,
            filename: 'component.ts',
            options: [
              {
                order: 'desc',
                type: 'line-length'
              }
            ]
          }
        ]
      }
    );

    ruleTester.run(
      `${ruleName}: works with special directive keys`,
      rule,
      {
        invalid: [],
        valid: [
          {
            code: dedent`
            <svelte:element key={1} this={expression} />
          `,
            filename: 'file.svelte',
            options: [
              {
                order: 'asc',
                type: 'alphabetical'
              }
            ]
          }
        ]
      }
    );
  });
});

