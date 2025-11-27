<script setup lang="ts">
import { ref, computed } from 'vue';

type TimeRange = 'today' | 'week' | 'month' | 'all' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

interface Props {
  modelValue: TimeRange;
  customRange?: DateRange;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: TimeRange): void;
  (e: 'update:customRange', value: DateRange): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showCustomDialog = ref(false);

const timeRanges = [
  { key: 'today' as TimeRange, label: '今天', icon: '📅', description: '今日数据' },
  { key: 'week' as TimeRange, label: '本周', icon: '📆', description: '最近7天' },
  { key: 'month' as TimeRange, label: '本月', icon: '📇', description: '最近30天' },
  { key: 'all' as TimeRange, label: '所有', icon: '📚', description: '全部历史' },
  { key: 'custom' as TimeRange, label: '自定义', icon: '📝', description: '选择日期范围' }
];

const currentValue = computed({
  get: () => props.modelValue,
  set: (value: TimeRange) => {
    if (value === 'custom') {
      showCustomDialog.value = true;
    } else {
      emit('update:modelValue', value);
    }
  }
});

const currentRange = computed(() => 
  timeRanges.find(range => range.key === props.modelValue)
);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const customRangeDisplay = computed(() => {
  if (!props.customRange) return '';
  return `${formatDate(props.customRange.start)} - ${formatDate(props.customRange.end)}`;
});

const handleCustomRangeApply = () => {
  emit('update:modelValue', 'custom');
  showCustomDialog.value = false;
};
</script>

<template>
  <div class="dropdown dropdown-top dropdown-end">
    <div 
      role="button" 
      tabindex="0" 
      class="btn btn-sm btn-ghost gap-2 px-3"
      :class="{ 'btn-disabled': disabled }"
    >
      <span class="text-lg">{{ currentRange?.icon }}</span>
      <span class="font-medium">
        {{ currentRange?.key === 'custom' ? customRangeDisplay : currentRange?.label }}
      </span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
    
    <ul class="dropdown-content menu bg-base-100 rounded-box shadow-lg border border-base-300 w-56 p-2">
      <li v-for="range in timeRanges.slice(0, -1)" :key="range.key">
        <a 
          @click="currentValue = range.key"
          :class="{ 'active': currentValue === range.key }"
          class="flex items-center gap-3"
        >
          <span class="text-xl">{{ range.icon }}</span>
          <div class="flex flex-col items-start">
            <span class="font-medium">{{ range.label }}</span>
            <span class="text-xs text-base-content/60">{{ range.description }}</span>
          </div>
        </a>
      </li>
      
      <li class="menu-title">
        <span class="text-xs font-semibold text-base-content/50">自定义范围</span>
      </li>
      
      <li>
        <a 
          @click="currentValue = 'custom'"
          :class="{ 'active': currentValue === 'custom' }"
          class="flex items-center gap-3"
        >
          <span class="text-xl">📝</span>
          <div class="flex flex-col items-start">
            <span class="font-medium">自定义日期</span>
            <span class="text-xs text-base-content/60">选择特定日期范围</span>
          </div>
        </a>
      </li>
    </ul>
  </div>

  <!-- 自定义日期范围对话框 -->
  <dialog 
    ref="customDialog" 
    class="modal modal-bottom sm:modal-middle"
    :open="showCustomDialog"
  >
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">选择自定义日期范围</h3>
      
      <div class="form-control gap-4">
        <div>
          <label class="label">
            <span class="label-text">开始日期</span>
          </label>
          <input 
            type="date" 
            class="input input-bordered w-full"
            :value="customRange?.start"
            @input="emit('update:customRange', { 
              ...props.customRange, 
              start: ($event.target as HTMLInputElement).value 
            })"
          />
        </div>
        
        <div>
          <label class="label">
            <span class="label-text">结束日期</span>
          </label>
          <input 
            type="date" 
            class="input input-bordered w-full"
            :value="customRange?.end"
            @input="emit('update:customRange', { 
              ...props.customRange, 
              end: ($event.target as HTMLInputElement).value 
            })"
          />
        </div>
      </div>
      
      <div class="modal-action">
        <button class="btn btn-ghost" @click="showCustomDialog = false">取消</button>
        <button 
          class="btn btn-primary" 
          @click="handleCustomRangeApply"
          :disabled="!customRange?.start || !customRange?.end"
        >
          应用
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="showCustomDialog = false">close</button>
    </form>
  </dialog>
</template>
