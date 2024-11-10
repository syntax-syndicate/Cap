import { createResource, Show, For } from "solid-js";
import { createStore } from "solid-js/store";
import { Select as KSelect } from "@kobalte/core/select";
import { recordingSettingsStore } from "~/store";
import { createCurrentRecordingQuery } from "~/utils/queries";
import { commands, type RecordingSettingsStore, TargetResolution, TargetFPS } from "~/utils/tauri";
import {
  MenuItem,
  MenuItemList,
  PopperContent,
  topLeftAnimateClasses,
} from "../../editor/ui";
import { SwitchButton } from "~/components/SwitchButton";

export default function RecordingSettings() {
  const [store] = createResource(() => recordingSettingsStore.get());

  return (
    <Show when={store.state === "ready" && ([store()] as const)}>
      {(store) => <Inner initialStore={store()[0] ?? null} />}
    </Show>
  );
}

type SettingOption<T> = {
  label: string,
  value: T,
}

type RecordingSetting = {
  label: string
} & ({
  key: "recording_resolution",
  options: SettingOption<TargetResolution>[],
} | {
  key: "recording_fps",
  options: SettingOption<TargetFPS>[],
});

const recordingSettings: RecordingSetting[] = [
  {
    key: "recording_resolution",
    label: "Target resolution for screen capturing",
    options: [
      {
        label: "720p",
        value: "_720p",
      },
      {
        label: "1080p",
        value: "_1080p",
      },
      {
        label: "Native resolution",
        value: "Native",
      },
    ],
  },
  {
    key: "recording_fps",
    label: "Target FPS for screen capturing",
    options: [
      {
        label: "30 fps",
        value: "_30",
      },
      {
        label: "60 fps",
        value: "_60",
      },
      {
        label: "Native refresh rate",
        value: "Native",
      },
    ],
  },
];

function Inner(props: { initialStore: RecordingSettingsStore | null }) {
  const currentRecording = createCurrentRecordingQuery();
  const [settings, setSettings] = createStore<RecordingSettingsStore>(
    props.initialStore ?? {
      use_hardware_acceleration: false,
      recording_resolution: "_1080p",
      recording_fps: "_30",
    }
  );

  const handleChange = async <K extends keyof RecordingSettingsStore>(key: K, value: RecordingSettingsStore[K]) => {
    console.log(`Handling settings change for ${key}: ${value}`);

    setSettings(key, value);
    const result = await commands.setRecordingSettings({
      ...settings,
      [key]: value,
    });
    if (result.status === "error") console.error(result.error);
  }

  const settingOption = (setting: RecordingSetting): typeof setting.options[0] => {
    return setting.options.find((option) => option.value === settings[setting.key])!;
  }

  const recordingInProgress = !!currentRecording.data;

  return (
    <div class="flex flex-col w-full h-full">
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-2 divide-y divide-gray-200">
          <div class="space-y-2 py-3">
            <div class="flex items-center justify-between">
              <p>Use hardware acceleration</p>
              <SwitchButton
                name="use_hardware_acceleration"
                value={settings.use_hardware_acceleration}
                disabled={recordingInProgress}
                onChange={handleChange}
              />
            </div>
            <For each={recordingSettings}>
              {(setting) => (
                <div class="space-y-2 py-3">
                  <p>{setting.label}</p>
                  <KSelect<typeof setting.options[0]>
                    options={setting.options}
                    optionValue="value"
                    optionTextValue="value"
                    value={settingOption(setting)}
                    disabled={recordingInProgress}
                    onChange={(option) => {
                      handleChange(setting.key, option!.value)
                    }}
                    itemComponent={(props) => (
                      <MenuItem<typeof KSelect.Item> as={KSelect.Item} item={props.item}>
                        <KSelect.ItemLabel class="flex-1">
                          {props.item.rawValue.label}
                        </KSelect.ItemLabel>
                      </MenuItem>
                    )}
                  >
                    <KSelect.Trigger class="flex flex-row items-center h-[2rem] px-[0.375rem] gap-[0.375rem] border rounded-lg border-gray-200 w-full disabled:text-gray-400 transition-colors KSelect">
                      <KSelect.Value<typeof setting.options[0]> class="">
                        {(state) => <span>{state.selectedOption().label}</span>}
                      </KSelect.Value>
                    </KSelect.Trigger>
                    <KSelect.Portal>
                      <PopperContent<typeof KSelect.Content>
                        as={KSelect.Content}
                        class={topLeftAnimateClasses}
                      >
                        <MenuItemList<typeof KSelect.Listbox>
                          class="max-h-36 overflow-y-auto"
                          as={KSelect.Listbox}
                        />
                      </PopperContent>
                    </KSelect.Portal>
                  </KSelect>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}
