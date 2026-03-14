import type Anthropic from '@anthropic-ai/sdk';

type ToolDef = Anthropic.Tool;

const elementTargetProps = {
  role: { type: 'string' as const, description: 'ARIA role (e.g. "button", "link", "textbox"). Preferred targeting method.' },
  name: { type: 'string' as const, description: 'Accessible name of the element. Use with role.' },
  text: { type: 'string' as const, description: 'Visible text content to match. Fallback if role+name unavailable.' },
  selector: { type: 'string' as const, description: 'CSS selector. Last resort.' },
};

export const tools: ToolDef[] = [
  // Observation tools
  {
    name: 'screenshot',
    description: 'Capture a screenshot of the current viewport. Use to observe the page state.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_accessibility_tree',
    description: 'Get the ARIA accessibility tree of the page. Shows all interactive elements with roles and names. Use this to identify elements to interact with.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_page_info',
    description: 'Get current page URL, title, viewport size, and loading state.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // Action tools
  {
    name: 'click',
    description: 'Click an element on the page. Returns a screenshot after clicking.',
    input_schema: {
      type: 'object',
      properties: {
        ...elementTargetProps,
        click_type: {
          type: 'string',
          enum: ['left', 'right', 'double'],
          description: 'Type of click. Default: left.',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what this click does. Required.',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'type',
    description: 'Type text into an input element. Returns a screenshot after typing.',
    input_schema: {
      type: 'object',
      properties: {
        ...elementTargetProps,
        text: {
          type: 'string',
          description: 'The text to type (overrides text-targeting if also used for element matching).',
        },
        target_text: {
          type: 'string',
          description: 'Text content to match for element targeting (when "text" is used for the value to type).',
        },
        clear_first: {
          type: 'boolean',
          description: 'Clear the input before typing. Default: false.',
        },
        character_by_character: {
          type: 'boolean',
          description: 'Type one character at a time with delay. Default: false.',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what this typing does. Required.',
        },
      },
      required: ['text', 'description'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key or key combination. Examples: "Enter", "Tab", "Control+a", "Meta+c".',
    input_schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Key or key combination to press.',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what this key press does. Required.',
        },
      },
      required: ['key', 'description'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the page or scroll to a specific element.',
    input_schema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Scroll direction. Used with amount.',
        },
        amount: {
          type: 'number',
          description: 'Pixels to scroll. Default: 500.',
        },
        to_role: { type: 'string', description: 'Scroll to element with this ARIA role.' },
        to_name: { type: 'string', description: 'Scroll to element with this accessible name.' },
        to_text: { type: 'string', description: 'Scroll to element containing this text.' },
        to_selector: { type: 'string', description: 'Scroll to element matching this CSS selector.' },
        description: {
          type: 'string',
          description: 'Human-readable description. Required.',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'hover',
    description: 'Hover over an element to reveal tooltips, menus, etc. Returns a screenshot.',
    input_schema: {
      type: 'object',
      properties: {
        ...elementTargetProps,
        description: {
          type: 'string',
          description: 'Human-readable description. Required.',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a URL.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to.',
        },
        description: {
          type: 'string',
          description: 'Human-readable description. Required.',
        },
      },
      required: ['url', 'description'],
    },
  },
  {
    name: 'wait',
    description: 'Wait for a condition: time, element visible/hidden, or network idle.',
    input_schema: {
      type: 'object',
      properties: {
        time: {
          type: 'number',
          description: 'Milliseconds to wait.',
        },
        element_visible: {
          type: 'object',
          properties: elementTargetProps,
          description: 'Wait for this element to become visible.',
        },
        element_hidden: {
          type: 'object',
          properties: elementTargetProps,
          description: 'Wait for this element to become hidden.',
        },
        network_idle: {
          type: 'boolean',
          description: 'Wait for network to be idle.',
        },
        description: {
          type: 'string',
          description: 'Human-readable description. Required.',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'select_option',
    description: 'Select an option from a dropdown/select element.',
    input_schema: {
      type: 'object',
      properties: {
        ...elementTargetProps,
        option_label: {
          type: 'string',
          description: 'The visible label of the option to select.',
        },
        option_value: {
          type: 'string',
          description: 'The value attribute of the option to select.',
        },
        description: {
          type: 'string',
          description: 'Human-readable description. Required.',
        },
      },
      required: ['description'],
    },
  },

  // Control tools
  {
    name: 'done',
    description: 'Signal that the task is complete. Call this when you have finished all actions.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of what was accomplished.',
        },
      },
      required: ['summary'],
    },
  },
  {
    name: 'narrate',
    description: 'Add a narration caption/subtitle at the current timestamp. Use before major sections to label what is happening for the viewer.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Narration text to display.',
        },
      },
      required: ['text'],
    },
  },
];
