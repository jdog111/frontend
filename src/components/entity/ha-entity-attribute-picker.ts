import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import { formatAttributeName } from "../../util/hass-attributes-util";
import "../ha-svg-icon";
import "./state-badge";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

const rowRenderer = (root: HTMLElement, _owner, model: { item: string }) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
      <style>
        paper-item {
          margin: -10px;
          padding: 0;
        }
      </style>
      <paper-item></paper-item>
    `;
  }
  root.querySelector("paper-item")!.textContent = formatAttributeName(
    model.item
  );
};

const SELECTABLE_ATTRIBUTES: { [key: string]: string[] } = {
  light: ["brightness"],
  climate: [
    "current_temperature",
    "fan_mode",
    "preset_mode",
    "swing_mode",
    "temperature",
    "current_hundity",
    "humidity",
    "hvac_action",
  ],
  fan: ["speed"],
  air_quality: [
    "nitrogen_oxide",
    "particulate_matter_10",
    "particulate_matter_2_5",
  ],
  cover: ["current_position", "current_tilt_position"],
  device_tracker: ["battery"],
  humidifier: ["humidty"],
  media_player: ["media_title"],
  vacuum: ["battery_level", "status"],
  water_heater: ["current_temperature", "temperature", "operation_mode"],
  weather: [
    "temperature",
    "humidity",
    "ozone",
    "pressure",
    "wind_bearing",
    "wind_speed",
    "visibility",
  ],
};

@customElement("ha-entity-attribute-picker")
class HaEntityAttributePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId?: string;

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property() public value?: string;

  @property({ type: Boolean }) private _opened = false;

  @query("vaadin-combo-box-light", true) private _comboBox!: HTMLElement;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_opened") && this._opened) {
      (this._comboBox as any).items = this.entityId
        ? this._selectableAttributes(this.entityId)
        : [];
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <vaadin-combo-box-light
        .value=${this._value}
        .allowCustomValue=${this.allowCustomValue}
        .renderer=${rowRenderer}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
      >
        <paper-input
          .autofocus=${this.autofocus}
          .label=${this.label ??
          this.hass.localize(
            "ui.components.entity.entity-attribute-picker.attribute"
          )}
          .value=${this._value ? formatAttributeName(this._value) : ""}
          .disabled=${this.disabled || !this.entityId}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          <div class="suffix" slot="suffix">
            ${this.value
              ? html`
                  <mwc-icon-button
                    .label=${this.hass.localize(
                      "ui.components.entity.entity-picker.clear"
                    )}
                    class="clear-button"
                    tabindex="-1"
                    @click=${this._clearValue}
                    no-ripple
                  >
                    <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}

            <mwc-icon-button
              .label=${this.hass.localize(
                "ui.components.entity.entity-attribute-picker.show_attributes"
              )}
              class="toggle-button"
              tabindex="-1"
            >
              <ha-svg-icon
                .path=${this._opened ? mdiMenuUp : mdiMenuDown}
              ></ha-svg-icon>
            </mwc-icon-button>
          </div>
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _selectableAttributes = memoizeOne((entity: string) => {
    const stateObj = this.hass.states[entity];
    if (!stateObj) {
      return [];
    }

    return Object.keys(stateObj.attributes).filter((attr) =>
      SELECTABLE_ATTRIBUTES[computeDomain(entity)].includes(attr)
    );
  });

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    this._setValue("");
  }

  private get _value() {
    return this.value;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    const newValue = ev.detail.value;
    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResult {
    return css`
      .suffix {
        display: flex;
      }
      mwc-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 0px 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-attribute-picker": HaEntityAttributePicker;
  }
}
