
'use strict';

// Lecteur de leçons H5P converties par DCI.
// Première étape : chargement et affichage en lecture seule.

const H5PPlayer = {
  async load(lessonId) {
    if (!/^zum-\d+$/.test(lessonId)) {
      throw new Error('Identifiant de leçon invalide');
    }

    const base = `./content/lessons/${lessonId}/`;
    const response = await fetch(base + 'lesson.json');

    if (!response.ok) {
      throw new Error(`Chargement impossible : ${response.status}`);
    }

    const lesson = await response.json();

    if (lesson.schemaVersion !== 1 ||
        lesson.id !== lessonId ||
        !Array.isArray(lesson.sections)) {
      throw new Error('Format de leçon invalide');
    }

    return { lesson, base };
  },

  renderImage(resource, base) {
    if (!/^media\/[a-zA-Z0-9._-]+$/.test(resource.path)) {
      throw new Error('Chemin de média invalide');
    }

    const figure = document.createElement('figure');
    const img = document.createElement('img');

    img.src = base + resource.path;
    img.alt = resource.alt || '';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';

    figure.appendChild(img);
    return figure;
  },


  renderSelectWords(exercise) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sentence';
    wrapper.style.whiteSpace = 'pre-wrap';

    const text = exercise.text || '';
    const matches = [...text.matchAll(/\p{L}+(?:['’-]\p{L}+)*/gu)];

    let cursor = 0;

    for (const match of matches) {
      const start = match.index;
      const end = start + match[0].length;

      wrapper.appendChild(
        document.createTextNode(text.slice(cursor, start))
      );

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'h5p-word';
      button.textContent = match[0];
      button.dataset.start = String(start);
      button.dataset.end = String(end);
      button.setAttribute('aria-pressed', 'false');

      button.addEventListener('click', () => {
        const selected =
          button.getAttribute('aria-pressed') === 'true';

        button.setAttribute('aria-pressed', String(!selected));
        button.classList.toggle('selected', !selected);
      });

      wrapper.appendChild(button);
      cursor = end;
    }

    wrapper.appendChild(
      document.createTextNode(text.slice(cursor))
    );


    const verify = document.createElement('button');
    verify.type = 'button';
    verify.className = 'primary';
    verify.textContent = 'Vérifier mes réponses';

    const feedback = document.createElement('p');
    feedback.setAttribute('aria-live', 'polite');

    verify.addEventListener('click', () => {
      const buttons = [...wrapper.querySelectorAll('button.h5p-word')];

      const expected = new Set(
        exercise.answers.map(answer =>
          `${answer.start}:${answer.end}`
        )
      );

      let correct = 0;
      let incorrect = 0;

      for (const button of buttons) {
        const key = `${button.dataset.start}:${button.dataset.end}`;
        const isExpected = expected.has(key);
        const isSelected =
          button.getAttribute('aria-pressed') === 'true';

        if (isSelected && isExpected) {
          correct++;
          button.style.borderColor = 'green';
        } else if (isSelected && !isExpected) {
          incorrect++;
          button.style.borderColor = 'red';
        }

        button.disabled = true;
      }

      feedback.textContent =
        `Résultat : ${correct} / ${expected.size} bonnes réponses` +
        (incorrect ? ` · ${incorrect} sélection(s) incorrecte(s)` : '');

      verify.disabled = true;
    });

    const controls = document.createElement('div');
    controls.style.marginTop = '16px';
    controls.append(verify, feedback);
    wrapper.appendChild(controls);


    return wrapper;
  },


  renderFillBlanksChoice(exercise) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sentence';
    wrapper.style.whiteSpace = 'pre-wrap';

    const parts = exercise.text.split('___');
    const answers = exercise.answers || [];

    // Les doublons restent dans les données d'origine,
    // mais ne sont pas répétés dans les menus.
    const choices = [...new Set(exercise.choices || [])];

    const selects = [];

    parts.forEach((part, index) => {
      wrapper.appendChild(document.createTextNode(part));

      if (index < parts.length - 1) {
        const select = document.createElement('select');
        select.className = 'h5p-blank-choice';
        select.setAttribute(
          'aria-label',
          `Terminaison manquante ${index + 1}`
        );

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '…';
        select.appendChild(placeholder);

        choices.forEach(choice => {
          const option = document.createElement('option');
          option.value = choice;
          option.textContent = choice;
          select.appendChild(option);
        });

        selects.push(select);
        wrapper.appendChild(select);
      }
    });

    const verify = document.createElement('button');
    verify.type = 'button';
    verify.className = 'primary';
    verify.textContent = 'Vérifier mes réponses';

    const feedback = document.createElement('p');
    feedback.setAttribute('aria-live', 'polite');

    verify.addEventListener('click', () => {
      let correct = 0;

      selects.forEach((select, index) => {
        const ok = select.value === answers[index];

        if (ok) correct++;

        select.style.borderColor = ok ? 'green' : 'red';
        select.disabled = true;
      });

      feedback.textContent =
        `Résultat : ${correct} / ${answers.length} bonnes réponses`;

      verify.disabled = true;
    });

    const controls = document.createElement('div');
    controls.style.marginTop = '16px';
    controls.append(verify, feedback);

    wrapper.appendChild(controls);

    return wrapper;
  },


  renderFillBlanks(exercise) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sentence';
    wrapper.style.whiteSpace = 'pre-wrap';

    const questions = exercise.questions || [];
    const allInputs = [];

    questions.forEach((question, questionIndex) => {
      const parts = question.text.split('___');
      const answers = question.answers || [];

      parts.forEach((part, index) => {
        wrapper.appendChild(document.createTextNode(part));

        if (index < parts.length - 1) {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'h5p-blank-input';
          input.autocomplete = 'off';
          input.autocapitalize = 'off';
          input.spellcheck = false;
          input.maxLength = 15;
          input.size = 4;

          input.setAttribute(
            'aria-label',
            `Terminaison ${index + 1}, question ${questionIndex + 1}`
          );

          allInputs.push({
            input,
            answer: answers[index]
          });

          wrapper.appendChild(input);
        }
      });

      wrapper.appendChild(document.createElement('p'));
    });

    const verify = document.createElement('button');
    verify.type = 'button';
    verify.className = 'primary';
    verify.textContent = 'Vérifier mes réponses';

    const feedback = document.createElement('p');
    feedback.setAttribute('aria-live', 'polite');

    verify.addEventListener('click', () => {
      let correct = 0;

      allInputs.forEach(({ input, answer }) => {
        const value = input.value.trim().toLocaleLowerCase('de');
        const expected = String(answer).trim().toLocaleLowerCase('de');
        const ok = value === expected;

        if (ok) correct++;

        input.style.borderColor = ok ? 'green' : 'red';
        input.disabled = true;
      });

      feedback.textContent =
        `Résultat : ${correct} / ${allInputs.length} bonnes réponses`;

      verify.disabled = true;
    });

    const controls = document.createElement('div');
    controls.style.marginTop = '16px';
    controls.append(verify, feedback);
    wrapper.appendChild(controls);

    return wrapper;
  },




  async show(lessonId, container) {
    const { lesson, base } = await this.load(lessonId);
    container.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = lesson.title;
    container.appendChild(title);

    const status = document.createElement('p');
    status.className = 'muted';
    status.textContent = 'Contenu en cours de validation';
    container.appendChild(status);

    for (const section of lesson.sections) {
      if (section.type === 'resource') {
        const resource = lesson.resources?.[section.resourceId];

        if (resource?.type === 'image') {
          container.appendChild(this.renderImage(resource, base));
        }
      }

      if (section.type === 'exercise') {
        const exercise = lesson.exercises?.[section.exerciseId];
        if (!exercise) continue;

        const card = document.createElement('div');
        card.className = 'card';

        const heading = document.createElement('h3');
        heading.textContent = exercise.title || exercise.type;

        const instructions = document.createElement('p');
        instructions.textContent = exercise.instructions || '';

        const note = document.createElement('p');
        note.className = 'muted';
        note.textContent = 'Exercice bientôt disponible';

        card.append(heading, instructions);

        if (exercise.type === 'select-words') {
            card.appendChild(this.renderSelectWords(exercise));
        } else if (exercise.type === 'fill-blanks-choice') {
            card.appendChild(this.renderFillBlanksChoice(exercise));
        } else if (exercise.type === 'fill-blanks') {
            card.appendChild(this.renderFillBlanks(exercise));
        } else {
            card.appendChild(note);
        }
        container.appendChild(card);
      }
    }
  }
};

