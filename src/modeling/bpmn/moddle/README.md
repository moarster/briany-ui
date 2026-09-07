# Moddle descriptors

Two vendored descriptors, both data files rather than code. Adding a Flowable attribute is
a JSON edit plus a panel entry, and nothing else.

## `flowable.json`

Derived from Flowable's own `flowable-bpmn-extensions.xsd`. We deliberately do **not**
depend on the npm package `flowable-bpmn-moddle`: it is version 0.0.2 and is a verbatim
copy of `camunda.json` with the prefix swapped, so it models Camunda semantics under a
Flowable name.

`bpmn:ScriptTask` is absent on purpose. Briany never executes code supplied through a
process model (PROMPT 1.5), so there is no script task in the palette, the context pad or
the properties panel. Nothing is lost on import: `bpmn:ScriptTask` is standard BPMN and
`bpmn-moddle` parses it, while unmodelled `flowable:` attributes on it land in moddle's
`$attrs` and re-serialise verbatim. The element round-trips; it is simply not editable, and
lint flags it.

### The `flowable:field` compromise

Flowable's XSD allows a field value either as an attribute (`stringValue`, `expression`) or
as a child element (`<flowable:string>`, `<flowable:expression>`). moddle cannot model an
attribute and a child element that share the name `expression` on the same type, so our
descriptor models `string` and `expression` as **child elements**, and the editor always
writes that form. It sidesteps escaping problems in JSON request bodies, URLs and
expressions.

What that actually costs on import was measured against `bpmn-moddle` 10, and the
round-trip suite pins it:

| Imported form                          | Read by the panel                                      | Re-serialised as                                                       |
| -------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `<flowable:expression>` child          | yes                                                    | child element, unchanged                                               |
| `<flowable:string>` child              | yes                                                    | child element, unchanged                                               |
| `flowable:expression="..."` attribute  | yes - moddle parses it into the same modelled property | **child element**: the value survives, the attribute spelling does not |
| `flowable:stringValue="..."` attribute | yes                                                    | attribute, unchanged                                                   |

So the `expression` attribute is not the read-only trap the original design assumed: it is
fully editable, and the only thing lost is which of two equivalent spellings Flowable sees.
`stringValue` is the one form that persists as an attribute, which is why it is what
`isAttributeForm` reports and what the panel's **Normalise fields** action rewrites. The
rewrite is never implicit - silently reshaping an imported model is exactly what the
import-permissive rule forbids.

## `briany.json`

Our own modelling-time namespace, `http://briany.ru/bpmn`. Two attributes on
`bpmn:BaseElement`:

| Attribute                  | Meaning                                               |
| -------------------------- | ----------------------------------------------------- |
| `briany:descriptorId`      | Which `BpmnElementDescriptor` configured this element |
| `briany:descriptorVersion` | The descriptor revision it was configured with        |

This is the equivalent of Camunda's `camunda:modelerTemplate`: it pins an element to a
descriptor version, so an older process keeps rendering against its own descriptor
revision. Flowable ignores attributes in unknown namespaces, so both are inert at runtime.
