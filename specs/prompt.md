# Briefing

- I want to create a simple app where I can add several key dates of the history of the humanity.
- This is a personal project. The goal is to have a better overview of what would be invented when in the humanity.
- The app will then display it chronologically.
- For each key date I will need to add
  - a date (year, number input)
  - a name (text input)
  - a predefined category (select input)
  - optional: an end date (year, number input)
  - optional: a region (text input)
- The date input should allow negative values for events before Jesus Christ.
- The predefined categories are:
  - invention
  - event
  - person
  - Do you see more relevant categories?

# UI and behaviors

Here is a full description of what the UI will look like.

- Login/logout button.
- Title: "On the edge"
- Lead: "Simple timeline viewer for major dates in human history."
- Button: "Add a new date". Only displayed when the user is logged in.
- Select: Filter by category. Default to "All categories" Each category has its own colour.
- When "All categories" is chosen, add a between the filter and the timeline with the labels for each categories with their colors. These labels will be sticked on top (position sticky) when the user scrolls through the timeline.
- Timeline:
  - A simple vertical line where all the dates are displayed on top of each other.
  - The newest dates are displayed on the top, the oldest on at the bottom.
  - Each date is a small dot on the timeline with the date and label on it left.
    - Example: • 1540: Pistolet
    - Example with end date and region: • 1939-1945: Deuxième guerre mondiale (Europe)
  - Each dot of a date as the color of its category.
- Yeah, when the user filter a category only displayed items of this category in the timeline.
- When the user clicks the "add a new date" button, it will open a modal to add a new date. In this model there was all the fields to have the new date aligned vertically.
- Responsive layout:
  - On mobile each element is displayed vertically after each other. With a column padding of 20 pixels.
  - The columns is as a max width of 800 pixels.
- Look and Feel: Fow now just keep the most minimalist design, Just implement layouts to position element without giving a lot of design.

# Tech stack

- NextJS App
- Tailwind for styling
- Shadcn for interactive components. For the beginning, just take the default styles of Shadcn.
- Login something very simple. What about Github? Or google?
- Database: Something portable and really easy to inspect. Ideally file based.
- At the end the goal is to post this simple websites on Netlify.
